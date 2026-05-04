// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract OfflinePaymentSystem {

    struct UserAccount {
        bytes securePublicKey; // Public Key จาก Secure Enclave
        uint256 lockedBalance;   // เงินที่ "ล็อคไว้จ่าย" (ถอนไม่ได้ ต้องใช้จ่ายออฟไลน์เท่านั้น)
        uint256 receivedBalance; // เงินที่ "ได้รับจากคนอื่น" (ถอนเป็นเงินสดได้)
        uint256 nonce;           // เริ่มที่ 0
        bool isRegistered;       // ตัวเช็คว่าเคยลงทะเบียนหรือยัง
    }

    mapping(address => UserAccount) public users;
    mapping(bytes32 => bool) public settledTxs;

    event Registered(address indexed user, bytes pubKey);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    event Settled(address indexed from, address indexed to, uint256 amount, uint256 nonce);

    // 1. ลงทะเบียนครั้งแรก
    function register(bytes memory _publicKey) external {
        require(!users[msg.sender].isRegistered, "Already registered");
        
        users[msg.sender].securePublicKey = _publicKey;
        users[msg.sender].isRegistered = true;
        users[msg.sender].nonce = 0;
        users[msg.sender].lockedBalance = 0;
        users[msg.sender].receivedBalance = 0;

        emit Registered(msg.sender, _publicKey);
    }

    // 2. ฝากเงินเข้า lockedBalance (เพื่อเอาไว้ใช้จ่าย Offline)
    function deposit() external payable {
        require(users[msg.sender].isRegistered, "Must register first");
        require(msg.value > 0, "Amount must > 0");

        users[msg.sender].lockedBalance += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    // 3. ถอนเงินจาก receivedBalance (เฉพาะเงินที่ได้จากการรับชำระเท่านั้น)
    function withdrawReceived(uint256 _amount) external {
        require(users[msg.sender].receivedBalance >= _amount, "Insufficient received balance");
        
        users[msg.sender].receivedBalance -= _amount;
        
        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, _amount);
    }

    // ฟังก์ชัน Get ข้อมูลสำหรับยิงถาม (ไม่เสีย Gas)
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

    // 4. ตั้งค่าการชำระเงิน offline (เรียกโดย anyone — relay หรือ receiver)
    function settlePayment(
        address _from,
        address _to,
        uint256 _amount,
        uint256 _nonce,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        // ตรวจว่าทั้งสองฝ่ายลงทะเบียนแล้ว
        require(users[_from].isRegistered, "Sender not registered");
        require(users[_to].isRegistered, "Receiver not registered");

        // ตรวจ nonce ต่อเนื่อง (กัน replay attack)
        require(_nonce == users[_from].nonce, "Invalid nonce");

        require(!settledTxs[_txKey(_from, _to, _nonce)], "Tx already settled");

        // สร้าง hash เดียวกับที่ client sign ไว้
        bytes32 hash = keccak256(
            abi.encode(_from, _to, _amount, _nonce)
        );

        // Ethereum prefix (เพื่อให้ตรงกับ ethers.js signingKey.sign)
        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );

        // Recover signer จาก signature
        address signer = ecrecover(ethHash, _v, _r, _s);
        require(signer != address(0), "Invalid signature format");
        require(signer == _from, "Invalid signature");

        // ตรวจ balance พอ
        require(users[_from].lockedBalance >= _amount, "Insufficient locked balance");

        // ย้ายเงิน
        users[_from].lockedBalance -= _amount;
        users[_to].receivedBalance += _amount;

        // เพิ่ม nonce (กัน replay)
        users[_from].nonce++;

        settledTxs[_txKey(_from, _to, _nonce)] = true;

        emit Settled(_from, _to, _amount, _nonce);
    }

    // helper สร้าง tx key
    function _txKey(address _from, address _to, uint256 _nonce) 
        internal pure returns (bytes32) 
    {
        return keccak256(abi.encode(_from, _to, _nonce));
    }

    // view function เช็คว่า tx นั้น settle แล้วหรือยัง
    function txExists(
        address _from,
        address _to,
        uint256 _nonce
    ) external view returns (bool) {
        return settledTxs[_txKey(_from, _to, _nonce)];
    }
}