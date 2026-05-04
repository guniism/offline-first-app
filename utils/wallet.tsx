import { JsonRpcProvider, parseEther, Wallet } from "ethers";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto"; // ใช้ตัวนี้แทนการสุ่มของ ethers
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { supportsSecureStore } from "./platform";

const PRIVATE_KEY_STORAGE_KEY = "user_private_key";
const ADDRESS_STORAGE_KEY = "user_address";

// เช็คว่ารันบน Expo Go หรือไม่ (ถ้าใช่ต้องปิด requireAuthentication)
const isExpoGo = Constants.appOwnership === "expo";

export const WalletService = {
  async generateAndSaveKeypair() {
    try {
      let wallet: any; // เปลี่ยนจาก Wallet เป็น any

      if (Platform.OS !== "web") {
        const randomBytes = Crypto.getRandomValues(new Uint8Array(32));
        const hexString = Array.from(randomBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        wallet = new Wallet(`0x${hexString}`);
      } else {
        wallet = Wallet.createRandom();
      }

      if (supportsSecureStore) {
        await SecureStore.setItemAsync(
          PRIVATE_KEY_STORAGE_KEY,
          wallet.privateKey,
          {
            keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            requireAuthentication: !isExpoGo,
          },
        );
        await SecureStore.setItemAsync(ADDRESS_STORAGE_KEY, wallet.address);
      } else if (Platform.OS === "web" && typeof window !== "undefined") {
        window.localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, wallet.privateKey);
        window.localStorage.setItem(ADDRESS_STORAGE_KEY, wallet.address);
      }

      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
      };
    } catch (error) {
      console.error("Error generating keypair:", error);
      throw error;
    }
  },

  async getStoredAddress() {
    if (supportsSecureStore) {
      return await SecureStore.getItemAsync(ADDRESS_STORAGE_KEY);
    } else if (Platform.OS === "web" && typeof window !== "undefined") {
      return window.localStorage.getItem(ADDRESS_STORAGE_KEY);
    }
    return null;
  },

  async getPrivateKey() {
    if (supportsSecureStore) {
      return await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY, {
        // ต้องสอดคล้องกับตอน Save
        requireAuthentication: !isExpoGo,
      });
    } else if (Platform.OS === "web" && typeof window !== "undefined") {
      return window.localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    }
    return null;
  },

  async clearKeys() {
    if (supportsSecureStore) {
      await SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY);
      await SecureStore.deleteItemAsync(ADDRESS_STORAGE_KEY);
    } else if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
      window.localStorage.removeItem(ADDRESS_STORAGE_KEY);
    }
  },

  async sendTransaction(toAddress: string, amountEth: string) {
    try {
      // 1. ดึง Private Key ที่เก็บไว้ในเครื่องออกมา
      const privateKey = await this.getPrivateKey();
      if (!privateKey)
        throw new Error("Wallet not found. Please generate one first.");

      // 2. เชื่อมต่อกับ Blockchain (ตัวอย่างเป็น Sepolia Testnet)
      // แนะนำให้ใช้ RPC URL ของตัวเองจาก Alchemy/Infura เพื่อความเสถียร
      const provider = new JsonRpcProvider(
        "https://eth-sepolia.g.alchemy.com/v2/ii61OtUjqG_3iyZR_3eEN",
      );

      // 3. สร้าง Wallet instance ที่ผูกกับ Provider
      const signer = new Wallet(privateKey, provider);

      // 4. ส่ง Transaction
      console.log(`Sending ${amountEth} ETH to ${toAddress}...`);
      const tx = await signer.sendTransaction({
        to: toAddress,
        value: parseEther(amountEth), // แปลงหน่วยจาก ETH เป็น Wei
      });

      console.log("Transaction sent! Hash:", tx.hash);

      // 5. รอการยืนยัน (Optional)
      // const receipt = await tx.wait();

      return { success: true, hash: tx.hash };
    } catch (error: any) {
      console.error("Transfer Error:", error);
      return { success: false, error: error.message };
    }
  },

  async getLocalWallet() {
    const privateKey = await this.getPrivateKey();
    if (!privateKey)
      throw new Error("Wallet not found. Please generate one first.");

    return new Wallet(privateKey);
  },
};

// ... ส่วนของ getBalance คงเดิม ...

// // ดักฟังทุกครั้งที่มี Block ใหม่ (ประมาณทุกๆ 12 วินาทีบน Ethereum)
// provider.on("block", async (blockNumber) => {
//   const newBalance = await getBalance(userAddress);
//   setBalance(newBalance); // อัปเดต State ใน UI
// });

export const getBalance = async (address: string): Promise<string> => {
  const API_KEY = "MNQGK1HRMJPUNBKAPVQI94KPZW2VXX3IVB";
  const CHAIN_ID = "11155111";

  const url = `https://api.etherscan.io/v2/api?apikey=${API_KEY}&module=account&chainid=${CHAIN_ID}&action=balance&address=${address}&tag=latest`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // เช็ค status จาก Etherscan API (1 คือสำเร็จ)
    if (data.status === "1") {
      const balanceInWei = data.result;
      const balanceInEth = parseFloat(balanceInWei) / 10 ** 18;

      console.log(`Address: ${address} | Balance: ${balanceInEth} ETH`);

      // ส่งคืนค่าเป็น String พร้อมทศนิยม 4 ตำแหน่งสำหรับโชว์ใน UI
      return balanceInEth.toFixed(4);
    } else {
      console.warn("API returned an error:", data.message);
      return "0.0000";
    }
  } catch (error) {
    console.error("Network or Parsing Error:", error);
    return "Error";
  }
};
