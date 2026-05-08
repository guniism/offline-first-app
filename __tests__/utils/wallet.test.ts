import * as SecureStore from 'expo-secure-store';
import { WalletService, getBalance } from '../../utils/wallet';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('expo-secure-store');
jest.mock('expo-crypto');
jest.mock('expo-constants');

jest.mock('../../utils/registerSmartContract', () => ({
  ETHERSCAN_API_KEY: 'test-api-key',
  getProvider: jest.fn().mockReturnValue({}),
}));

// Wallet mock — all instances share the same mockSendTransaction so tests can spy on it
const mockSendTransaction = jest.fn().mockResolvedValue({ hash: '0xTxHash123' });

jest.mock('ethers', () => {
  const MockWallet = jest.fn().mockImplementation((key: string) => ({
    address: '0xMockAddress',
    privateKey: key ?? '0xMockPrivateKey',
    signingKey: { publicKey: '0xMockPublicKey' },
    connect: jest.fn().mockReturnThis(),
    sendTransaction: mockSendTransaction,
    signMessage: jest.fn().mockResolvedValue('0xMockSignature'),
  }));
  MockWallet.createRandom = jest.fn().mockReturnValue({
    address: '0xRandomAddress',
    privateKey: '0xRandomPrivKey',
    signingKey: { publicKey: '0xRandomPublicKey' },
  });

  return {
    Wallet: MockWallet,
    parseEther: jest.fn((eth: string) => BigInt(Math.floor(parseFloat(eth) * 1e18))),
    JsonRpcProvider: jest.fn(),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockStore = (SecureStore as unknown as { _store: Record<string, string> })._store;

function resetSecureStore() {
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WalletService', () => {
  beforeEach(() => {
    resetSecureStore();
    jest.clearAllMocks();
    // Restore mockSendTransaction after clearAllMocks resets its calls
    mockSendTransaction.mockResolvedValue({ hash: '0xTxHash123' });
  });

  describe('generateAndSaveKeypair', () => {
    it('saves private key and address to SecureStore', async () => {
      const result = await WalletService.generateAndSaveKeypair();
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('privateKey');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user_private_key',
        expect.any(String),
        expect.any(Object),
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user_address',
        expect.any(String),
      );
    });

    it('returns the wallet address and privateKey', async () => {
      const result = await WalletService.generateAndSaveKeypair();
      expect(typeof result.address).toBe('string');
      expect(typeof result.privateKey).toBe('string');
    });
  });

  describe('getStoredAddress', () => {
    it('returns null when no address is stored', async () => {
      const address = await WalletService.getStoredAddress();
      expect(address).toBeNull();
    });

    it('returns the stored address', async () => {
      mockStore['user_address'] = '0xSavedAddress';
      const address = await WalletService.getStoredAddress();
      expect(address).toBe('0xSavedAddress');
    });
  });

  describe('getPrivateKey', () => {
    it('returns null when no key is stored', async () => {
      const key = await WalletService.getPrivateKey();
      expect(key).toBeNull();
    });

    it('returns the stored private key', async () => {
      mockStore['user_private_key'] = '0xStoredKey';
      const key = await WalletService.getPrivateKey();
      expect(key).toBe('0xStoredKey');
    });
  });

  describe('clearKeys', () => {
    it('removes both keys from SecureStore', async () => {
      mockStore['user_private_key'] = '0xKey';
      mockStore['user_address'] = '0xAddr';
      await WalletService.clearKeys();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_private_key');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_address');
    });
  });

  describe('sendTransaction', () => {
    it('returns an error when no wallet is stored', async () => {
      const result = await WalletService.sendTransaction('0xRecipient', '0.1');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Wallet not found/i);
    });

    it('sends a transaction and returns the hash on success', async () => {
      mockStore['user_private_key'] = '0xValidKey';
      const result = await WalletService.sendTransaction('0xRecipient', '0.1');
      expect(result.success).toBe(true);
      expect(result.hash).toBe('0xTxHash123');
    });

    it('returns an error object when the send throws', async () => {
      mockStore['user_private_key'] = '0xValidKey';
      mockSendTransaction.mockRejectedValueOnce(new Error('insufficient funds'));
      const result = await WalletService.sendTransaction('0xRecipient', '0.1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('insufficient funds');
    });
  });

  describe('getLocalWallet', () => {
    it('throws when no private key is stored', async () => {
      await expect(WalletService.getLocalWallet()).rejects.toThrow(/Wallet not found/i);
    });

    it('returns a Wallet instance when a key exists', async () => {
      mockStore['user_private_key'] = '0xValidKey';
      const wallet = await WalletService.getLocalWallet();
      expect(wallet).toBeDefined();
      expect(wallet.address).toBe('0xMockAddress');
    });
  });
});

// ── getBalance ────────────────────────────────────────────────────────────────

describe('getBalance', () => {
  const mockFetch = jest.fn();
  beforeAll(() => {
    global.fetch = mockFetch;
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns formatted ETH balance when API succeeds', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        status: '1',
        result: '1500000000000000000', // 1.5 ETH in wei
      }),
    });
    const balance = await getBalance('0xSomeAddress');
    expect(balance).toBe('1.5000');
  });

  it('returns "0.0000" when the API returns an error status', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ status: '0', message: 'NOTOK' }),
    });
    const balance = await getBalance('0xSomeAddress');
    expect(balance).toBe('0.0000');
  });

  it('returns "Error" on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const balance = await getBalance('0xSomeAddress');
    expect(balance).toBe('Error');
  });
});
