// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract OfflinePaymentSystem {

    struct UserAccount {
        bytes securePublicKey; // The Public Key derived from a Secure Enclave (TEE)
        uint256 lockedBalance;   // Funds locked for offline spending (cannot be withdrawn until settled)
        uint256 receivedBalance; // Funds received from others (available for withdrawal)
        uint256 nonce;           // Current transaction counter to prevent replay attacks
        bool isRegistered;       // Flag to check if the user is registered in the system
    }

    mapping(address => UserAccount) public users;
    mapping(bytes32 => bool) public settledTxs;

    event Registered(address indexed user, bytes pubKey);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    event Settled(address indexed from, address indexed to, uint256 amount, uint256 nonce);

    // 1. Initial registration
    function register(bytes memory _publicKey) external {
        require(!users[msg.sender].isRegistered, "Already registered");
        
        users[msg.sender].securePublicKey = _publicKey;
        users[msg.sender].isRegistered = true;
        users[msg.sender].nonce = 0;
        users[msg.sender].lockedBalance = 0;
        users[msg.sender].receivedBalance = 0;

        emit Registered(msg.sender, _publicKey);
    }

    // 2. Deposit ETH into lockedBalance (intended for offline usage)
    function deposit() external payable {
        require(users[msg.sender].isRegistered, "Must register first");
        require(msg.value > 0, "Amount must > 0");

        users[msg.sender].lockedBalance += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    // 3. Withdraw funds from receivedBalance (only for funds received from payments)
    function withdrawReceived(uint256 _amount) external {
        require(users[msg.sender].receivedBalance >= _amount, "Insufficient received balance");
        
        users[msg.sender].receivedBalance -= _amount;
        
        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, _amount);
    }

    // View function to fetch user data (Gasless query)
    function checkBalances(address _user) external view returns (
        uint256 forSpending, 
        uint256 forWithdraw,
        uint256 currentNonce
    ) {
        return (
            users[_user].lockedBalance, 
            users[_user].receivedBalance,
            users[_user].nonce
        );
    }

    // 4. Settle an offline payment (Called by anyone — usually the relayer or receiver)
    function settlePayment(
        address _from,
        address _to,
        uint256 _amount,
        uint256 _nonce,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        // Ensure both parties are registered
        require(users[_from].isRegistered, "Sender not registered");
        require(users[_to].isRegistered, "Receiver not registered");

        // Sequential nonce check to prevent replay attacks
        require(_nonce == users[_from].nonce, "Invalid nonce");

        require(!settledTxs[_txKey(_from, _to, _nonce)], "Tx already settled");

        // Recreate the hash originally signed by the client
        bytes32 hash = keccak256(
            abi.encode(_from, _to, _amount, _nonce)
        );

        // Ethereum prefix (consistent with ethers.js signingKey.sign)
        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );

        // Recover the signer address from the signature
        address signer = ecrecover(ethHash, _v, _r, _s);
        require(signer != address(0), "Invalid signature format");
        require(signer == _from, "Invalid signature");

        // Verify sufficient locked balance
        require(users[_from].lockedBalance >= _amount, "Insufficient locked balance");

        // Transfer funds between balances
        users[_from].lockedBalance -= _amount;
        users[_to].receivedBalance += _amount;

        // Increment nonce to prevent replay
        users[_from].nonce++;

        settledTxs[_txKey(_from, _to, _nonce)] = true;

        emit Settled(_from, _to, _amount, _nonce);
    }

    // Helper to generate a unique transaction key
    function _txKey(address _from, address _to, uint256 _nonce) 
        internal pure returns (bytes32) 
    {
        return keccak256(abi.encode(_from, _to, _nonce));
    }

    // View function to check if a specific transaction has been settled
    function txExists(
        address _from,
        address _to,
        uint256 _nonce
    ) external view returns (bool) {
        return settledTxs[_txKey(_from, _to, _nonce)];
    }
}