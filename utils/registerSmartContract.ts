import { SignedPayload } from "@/types/types";
import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";
import { isWeb, supportsSecureStore } from "./platform";
import { WalletService } from "./wallet";

const ALCHEMY_API_KEY =
  "https://eth-sepolia.g.alchemy.com/v2/ii61OtUjqG_3iyZR_3eEN";

export const ETHERSCAN_API_KEY = "MNQGK1HRMJPUNBKAPVQI94KPZW2VXX3IVB";

const NONCE = "user_nonce";
const LOCKED_BALANCE = "user_locked_balance";

// const CONTRACT_ADDRESS = "0xF305F449d9e4258C077575f0c1b09bc777A4B1Cc"; // Previous Smart Contract
const CONTRACT_ADDRESS = "0x55a78F1Db4F0dDd0860d6fE032B71eC21Eb88CED";
const CONTRACT_ABI = [
  "function register(bytes memory _publicKey) external",
  "function deposit() external payable",
  "function withdrawReceived(uint256 _amount) external",

  "function settlePayment(address _from, address _to, uint256 _amount, uint256 _nonce, uint8 _v, bytes32 _r, bytes32 _s) external",
  "function txExists(address _from, address _to, uint256 _nonce) external view returns (bool)",
  "function checkBalances(address _user) external view returns (uint256 forSpending, uint256 forWithdraw, uint256 currentNonce)",
];

export const getProvider = () => {
  const provider = new ethers.JsonRpcProvider(ALCHEMY_API_KEY);
  return provider;
};

export const registerSmartContract = {
  async register() {
    const wallet = await WalletService.getLocalWallet();
    if (!wallet) throw new Error("No wallet found");

    const signer = wallet.connect(getProvider());
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer,
    );

    let locked, received, nonce;

    try {
      // First Register
      const publicKey = wallet.signingKey.publicKey;
      const tx = await contract.register(ethers.toUtf8Bytes(publicKey));
      await tx.wait();

      locked = 0n;
      received = 0n;
      nonce = 0n;

      await this.saveLocalData("-1", "0"); // Success
    } catch (error) {
      // Error: Already registered
      if (
        error instanceof Error &&
        error.message.includes("Already registered")
      ) {
        console.log("User already registered on-chain. Syncing data...");

        const [onChainLocked, onChainReceived, onChainNonce] =
          await contract.checkBalances(wallet.address);

        locked = onChainLocked;
        received = onChainReceived;
        nonce = onChainNonce;

        await this.saveLocalData(undefined, locked.toString()); // Store local
      } else {
        throw error;
      }
    }
    return {
      success: true,
      lockedBalance: ethers.formatEther(locked),
      receivedBalance: ethers.formatEther(received),
      nonce: nonce.toString(),
    };
  },

  async saveLocalData(nonce?: string, lockedBalance?: string) {
    if (supportsSecureStore) {
      if (nonce) {
        await SecureStore.setItemAsync(NONCE, nonce);
      }
      if (lockedBalance) {
        await SecureStore.setItemAsync(LOCKED_BALANCE, lockedBalance);
      }
    } else if (isWeb && typeof window !== "undefined") {
      if (nonce) {
        window.localStorage.setItem(NONCE, nonce);
      }
      if (lockedBalance) {
        window.localStorage.setItem(LOCKED_BALANCE, lockedBalance);
      }
    }
  },

  async getBalances() {
    const wallet = await WalletService.getLocalWallet();
    if (!wallet) throw new Error("No wallet found");

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      getProvider(),
    );

    const [locked, received, nonce] = await contract.checkBalances(
      wallet.address,
    );

    return {
      lockedBalance: ethers.formatEther(locked), // ETH string
      receivedBalance: ethers.formatEther(received),
      nonce: nonce.toString(),
    };
  },

  async deposit(amountInEth: string) {
    const wallet = await WalletService.getLocalWallet();
    if (!wallet) throw new Error("No wallet found");

    const signer = wallet.connect(getProvider());
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer,
    );

    try {
      const tx = await contract.deposit({
        value: ethers.parseEther(amountInEth), // ETH2Wei
      });

      console.log("Deposit pending...", tx.hash);
      await tx.wait();

      // Success then fetch balances
      const [locked, received, nonce] = await contract.checkBalances(
        wallet.address,
      );

      await this.saveLocalData(undefined, locked.toString());

      return {
        success: true,
        lockedBalance: ethers.formatEther(locked),
        receivedBalance: ethers.formatEther(received),
        nonce: nonce.toString(),
      };
    } catch (error) {
      console.error("Deposit failed:", error);
      throw error;
    }
  },
  async withdraw(amountInEth: string) {
    const wallet = await WalletService.getLocalWallet();
    if (!wallet) throw new Error("No wallet found");

    const signer = wallet.connect(getProvider());
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer,
    );

    try {
      const [, received] = await contract.checkBalances(wallet.address);
      const amountInWei = ethers.parseEther(amountInEth);

      if (received < amountInWei) {
        throw new Error(
          `Insufficient received balance. Available: ${ethers.formatEther(received)} ETH`,
        );
      }

      const tx = await contract.withdrawReceived(amountInWei);
      console.log("Withdraw pending...", tx.hash);
      await tx.wait();

      const [locked, newReceived, nonce] = await contract.checkBalances(
        wallet.address,
      );

      await this.saveLocalData(undefined, locked.toString());

      return {
        success: true,
        lockedBalance: ethers.formatEther(locked),
        receivedBalance: ethers.formatEther(newReceived),
        nonce: nonce.toString(),
      };
    } catch (error) {
      console.error("Withdraw failed:", error);
      throw error;
    }
  },

  async withdrawAll() {
    const wallet = await WalletService.getLocalWallet();
    if (!wallet) throw new Error("No wallet found");

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      getProvider(),
    );

    try {
      const [, received] = await contract.checkBalances(wallet.address);

      if (received === 0n) {
        throw new Error("No balance available to withdraw");
      }

      // BigInt2String
      const totalAmountEth = ethers.formatEther(received);

      return await this.withdraw(totalAmountEth);
    } catch (error) {
      console.error("Withdraw All failed:", error);
      throw error;
    }
  },
  async getLocalNonce(): Promise<number | null> {
    let nonce: string | null = null;

    if (supportsSecureStore) {
      nonce = await SecureStore.getItemAsync(NONCE);
    } else if (isWeb && typeof window !== "undefined") {
      nonce = window.localStorage.getItem(NONCE);
    }

    return nonce ? Number(nonce) : null;
  },
  async getLockedBalance(): Promise<bigint | null> {
    let locked: string | null = null;

    if (supportsSecureStore) {
      locked = await SecureStore.getItemAsync(LOCKED_BALANCE);
    } else if (isWeb && typeof window !== "undefined") {
      locked = window.localStorage.getItem(LOCKED_BALANCE);
    }

    return locked ? BigInt(locked) : null;
  },
};

export const settlementSmartContract = {
  async settle(payload: SignedPayload) {
    const wallet = await WalletService.getLocalWallet();
    if (!wallet) throw new Error("No wallet found");

    const provider = new ethers.JsonRpcProvider(
      "https://eth-sepolia.g.alchemy.com/v2/ii61OtUjqG_3iyZR_3eEN",
    );
    const signer = wallet.connect(provider);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer,
    );

    // Check Settle
    const already = await contract.txExists(
      payload.from,
      payload.to,
      payload.nonce,
    );
    if (already) {
      return { success: true, alreadySettled: true };
    }

    const tx = await contract.settlePayment(
      payload.from,
      payload.to,
      BigInt(payload.amount),
      payload.nonce,
      payload.signature.v,
      payload.signature.r,
      payload.signature.s,
    );

    console.log("Settlement pending...", tx.hash);
    await tx.wait();

    // Sync balance after settle
    const [locked, received, nonce] = await contract.checkBalances(
      wallet.address,
    );

    return {
      success: true,
      alreadySettled: false,
      lockedBalance: ethers.formatEther(locked),
      receivedBalance: ethers.formatEther(received),
      nonce: nonce.toString(),
    };
  },

  async txExists(from: string, to: string, nonce: number): Promise<boolean> {
    const provider = new ethers.JsonRpcProvider(
      "https://eth-sepolia.g.alchemy.com/v2/ii61OtUjqG_3iyZR_3eEN",
    );
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider,
    );
    return await contract.txExists(from, to, nonce);
  },

  async checkBalances(address: string) {
    const provider = new ethers.JsonRpcProvider(
      "https://eth-sepolia.g.alchemy.com/v2/ii61OtUjqG_3iyZR_3eEN",
    );
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider,
    );
    const [forSpending, forWithdraw, currentNonce] =
      await contract.checkBalances(address);
    return {
      forSpending: ethers.formatEther(forSpending),
      forWithdraw: ethers.formatEther(forWithdraw),
      currentNonce: Number(currentNonce),
    };
  },
};
