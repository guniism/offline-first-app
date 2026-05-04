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

    event Registered(address indexed user, bytes pubKey);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

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
}