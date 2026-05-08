import { parseEther, Wallet } from "ethers";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto"; // ใช้ตัวนี้แทนการสุ่มของ ethers
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { supportsSecureStore } from "./platform";
import { ETHERSCAN_API_KEY, getProvider } from "./registerSmartContract";

const PRIVATE_KEY_STORAGE_KEY = "user_private_key";
const ADDRESS_STORAGE_KEY = "user_address";

// Check Expo Go
const isExpoGo = Constants.appOwnership === "expo";

export const WalletService = {
  async generateAndSaveKeypair() {
    try {
      let wallet: any;

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
      const privateKey = await this.getPrivateKey();
      if (!privateKey)
        throw new Error("Wallet not found. Please generate one first.");

      const signer = new Wallet(privateKey, getProvider());

      console.log(`Sending ${amountEth} ETH to ${toAddress}...`);
      const tx = await signer.sendTransaction({
        to: toAddress,
        value: parseEther(amountEth), //ETH2Wei
      });

      console.log("Transaction sent! Hash:", tx.hash);

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

export const getBalance = async (address: string): Promise<string> => {
  const apikey = ETHERSCAN_API_KEY;
  const CHAIN_ID = "11155111";

  const url = `https://api.etherscan.io/v2/api?apikey=${apikey}&module=account&chainid=${CHAIN_ID}&action=balance&address=${address}&tag=latest`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // Etherscan API check status
    if (data.status === "1") {
      const balanceInWei = data.result;
      const balanceInEth = parseFloat(balanceInWei) / 10 ** 18;

      console.log(`Address: ${address} | Balance: ${balanceInEth} ETH`);

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
