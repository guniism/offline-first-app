// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract OfflinePaymentSystem {

    struct UserAccount {
        bytes securePublicKey; // Public Key from the device's Secure Enclave
        uint256 lockedBalance;   // Funds "Locked for spending" (Non-withdrawable, for offline use only)
        uint256 receivedBalance; // Funds "Received from others" (Withdrawable to wallet)
        uint256 nonce;           // Transaction counter, starts at 0
        bool isRegistered;       // Registration status flag
    }

    mapping(address => UserAccount) public users;

    event Registered(address indexed user, bytes pubKey);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

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

    // 2. Deposit ETH into lockedBalance (to be used for offline payments)
    function deposit() external payable {
        require(users[msg.sender].isRegistered, "Must register first");
        require(msg.value > 0, "Amount must > 0");

        users[msg.sender].lockedBalance += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    // 3. Withdraw ETH from receivedBalance (funds acquired from receiving payments)
    function withdrawReceived(uint256 _amount) external {
        require(users[msg.sender].receivedBalance >= _amount, "Insufficient received balance");
        
        users[msg.sender].receivedBalance -= _amount;
        
        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, _amount);
    }

    // Helper function to query account data (Read-only, costs no Gas)
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
}