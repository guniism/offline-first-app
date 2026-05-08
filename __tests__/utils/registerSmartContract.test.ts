import * as SecureStore from 'expo-secure-store';
import { ethers } from 'ethers';
import { SignedPayload } from '../../types/types';
import {
  registerSmartContract,
  settlementSmartContract,
} from '../../utils/registerSmartContract';
import { WalletService } from '../../utils/wallet';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-secure-store');
jest.mock('expo-constants');

// Variables prefixed with "mock" are accessible inside jest.mock factories (Jest hoisting rule)
const mockTx = { hash: '0xTxHash', wait: jest.fn().mockResolvedValue({}) };
const mockContract = {
  register: jest.fn().mockResolvedValue(mockTx),
  deposit: jest.fn().mockResolvedValue(mockTx),
  withdrawReceived: jest.fn().mockResolvedValue(mockTx),
  checkBalances: jest.fn().mockResolvedValue([
    BigInt('1000000000000000000'), // 1 ETH locked
    BigInt('500000000000000000'),  // 0.5 ETH received
    5n,                            // nonce
  ]),
  txExists: jest.fn().mockResolvedValue(false),
  settlePayment: jest.fn().mockResolvedValue(mockTx),
};

jest.mock('ethers', () => ({
  ethers: {
    Contract: jest.fn().mockReturnValue(mockContract),
    JsonRpcProvider: jest.fn(),
    // Simple implementations that match ethers v6 output format
    formatEther: (wei: bigint) => {
      const n = Number(BigInt(String(wei))) / 1e18;
      return n % 1 === 0 ? `${n.toFixed(1)}` : String(n);
    },
    parseEther: (eth: string) => BigInt(Math.round(parseFloat(eth) * 1e18)),
    toUtf8Bytes: (str: string) => Buffer.from(str, 'utf8'),
  },
}));

const mockWallet = {
  address: '0xMockWalletAddress',
  connect: jest.fn().mockReturnThis(),
  signingKey: { publicKey: '0xMockPublicKey' },
};

jest.mock('../../utils/wallet', () => ({
  WalletService: {
    getLocalWallet: jest.fn().mockResolvedValue(mockWallet),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const makePayload = (overrides: Partial<SignedPayload> = {}): SignedPayload => ({
  uuid: 'test-uuid',
  from: '0xSender',
  to: '0xReceiver',
  amount: '1000000000000000000',
  nonce: 0,
  status: 'PENDING',
  isOwner: true,
  signature: { r: '0xr', s: '0xs', v: 27 },
  signedAt: 1000000,
  ...overrides,
});

// Re-establish all mock implementations — called after jest.clearAllMocks()
function resetMocks() {
  // Clear SecureStore state to prevent cross-test contamination
  const store = (SecureStore as unknown as { _store: Record<string, string> })._store;
  Object.keys(store).forEach((k) => delete store[k]);

  // ethers.Contract always returns mockContract
  (ethers as unknown as { Contract: jest.Mock }).Contract.mockReturnValue(mockContract);
  // WalletService always returns mockWallet
  (WalletService.getLocalWallet as jest.Mock).mockResolvedValue(mockWallet);
  mockWallet.connect.mockReturnThis();
  // tx
  mockTx.wait.mockResolvedValue({});
  // contract methods
  mockContract.register.mockResolvedValue(mockTx);
  mockContract.deposit.mockResolvedValue(mockTx);
  mockContract.withdrawReceived.mockResolvedValue(mockTx);
  mockContract.checkBalances.mockResolvedValue([
    BigInt('1000000000000000000'),
    BigInt('500000000000000000'),
    5n,
  ]);
  mockContract.txExists.mockResolvedValue(false);
  mockContract.settlePayment.mockResolvedValue(mockTx);
}

// ── registerSmartContract ──────────────────────────────────────────────────────

describe('registerSmartContract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMocks();
  });

  describe('register', () => {
    it('returns success with zero balances on first registration', async () => {
      const result = await registerSmartContract.register();
      expect(result.success).toBe(true);
      expect(result.lockedBalance).toBe('0.0');
      expect(result.receivedBalance).toBe('0.0');
      expect(result.nonce).toBe('0');
    });

    it('syncs on-chain balances when already registered', async () => {
      mockContract.register.mockRejectedValueOnce(new Error('Already registered'));
      mockContract.checkBalances.mockResolvedValueOnce([
        BigInt('2000000000000000000'), // 2 ETH
        BigInt('1000000000000000000'), // 1 ETH
        3n,
      ]);
      const result = await registerSmartContract.register();
      expect(result.success).toBe(true);
      expect(result.lockedBalance).toBe('2.0');
      expect(result.nonce).toBe('3');
    });

    it('rethrows errors that are not "Already registered"', async () => {
      mockContract.register.mockRejectedValueOnce(new Error('Out of gas'));
      await expect(registerSmartContract.register()).rejects.toThrow('Out of gas');
    });
  });

  describe('getBalances', () => {
    it('returns formatted balances from the contract', async () => {
      const result = await registerSmartContract.getBalances();
      expect(result.lockedBalance).toBe('1.0');
      expect(result.receivedBalance).toBe('0.5');
      expect(result.nonce).toBe('5');
    });
  });

  describe('deposit', () => {
    it('deposits ETH and returns updated balances', async () => {
      const result = await registerSmartContract.deposit('0.5');
      expect(result.success).toBe(true);
      expect(mockContract.deposit).toHaveBeenCalledTimes(1);
    });

    it('throws when the contract deposit call fails', async () => {
      mockContract.deposit.mockRejectedValueOnce(new Error('reverted'));
      await expect(registerSmartContract.deposit('0.5')).rejects.toThrow('reverted');
    });
  });

  describe('withdraw', () => {
    it('withdraws available received balance', async () => {
      const result = await registerSmartContract.withdraw('0.1');
      expect(result.success).toBe(true);
      expect(mockContract.withdrawReceived).toHaveBeenCalledTimes(1);
    });

    it('throws when requested amount exceeds received balance', async () => {
      await expect(registerSmartContract.withdraw('1.0')).rejects.toThrow(
        /Insufficient received balance/i,
      );
    });
  });

  describe('withdrawAll', () => {
    it('withdraws the full received balance', async () => {
      const result = await registerSmartContract.withdrawAll();
      expect(result.success).toBe(true);
    });

    it('throws when received balance is zero', async () => {
      mockContract.checkBalances.mockResolvedValueOnce([0n, 0n, 0n]);
      await expect(registerSmartContract.withdrawAll()).rejects.toThrow(
        /No balance available/i,
      );
    });
  });

  describe('saveLocalData / getLocalNonce / getLockedBalance', () => {
    it('getLocalNonce returns null when nothing is stored', async () => {
      const nonce = await registerSmartContract.getLocalNonce();
      expect(nonce).toBeNull();
    });

    it('getLockedBalance returns null when nothing is stored', async () => {
      const balance = await registerSmartContract.getLockedBalance();
      expect(balance).toBeNull();
    });

    it('saveLocalData persists nonce and lockedBalance', async () => {
      await registerSmartContract.saveLocalData('5', '1000000000000000000');
      const nonce = await registerSmartContract.getLocalNonce();
      const balance = await registerSmartContract.getLockedBalance();
      expect(nonce).toBe(5);
      expect(balance).toBe(BigInt('1000000000000000000'));
    });
  });
});

// ── settlementSmartContract ────────────────────────────────────────────────────

describe('settlementSmartContract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMocks();
  });

  describe('settle', () => {
    it('submits a new payment and returns success', async () => {
      const result = await settlementSmartContract.settle(makePayload());
      expect(result.success).toBe(true);
      expect(result.alreadySettled).toBe(false);
      expect(mockContract.settlePayment).toHaveBeenCalledTimes(1);
    });

    it('returns alreadySettled=true when txExists is true', async () => {
      mockContract.txExists.mockResolvedValueOnce(true);
      const result = await settlementSmartContract.settle(makePayload());
      expect(result.success).toBe(true);
      expect(result.alreadySettled).toBe(true);
      expect(mockContract.settlePayment).not.toHaveBeenCalled();
    });

    it('returns updated balances after settlement', async () => {
      const result = await settlementSmartContract.settle(makePayload());
      expect(result.lockedBalance).toBe('1.0');
      expect(result.receivedBalance).toBe('0.5');
      expect(result.nonce).toBe('5');
    });
  });

  describe('txExists', () => {
    it('returns false when transaction does not exist', async () => {
      const exists = await settlementSmartContract.txExists('0xFrom', '0xTo', 0);
      expect(exists).toBe(false);
    });

    it('returns true when transaction exists on-chain', async () => {
      mockContract.txExists.mockResolvedValueOnce(true);
      const exists = await settlementSmartContract.txExists('0xFrom', '0xTo', 0);
      expect(exists).toBe(true);
    });
  });

  describe('checkBalances', () => {
    it('returns formatted balances for an address', async () => {
      const result = await settlementSmartContract.checkBalances('0xAddress');
      expect(result.forSpending).toBe('1.0');
      expect(result.forWithdraw).toBe('0.5');
      expect(result.currentNonce).toBe(5);
    });
  });
});
