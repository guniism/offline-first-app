import { ethers } from 'ethers';
import { signPayload } from '../../utils/signPayload';
import { WalletService } from '../../utils/wallet';

jest.mock('../../utils/wallet');

// Well-known test key — smallest valid secp256k1 private key
const TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
const testWallet = new ethers.Wallet(TEST_PRIVATE_KEY);

const FROM = testWallet.address;
const TO = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

beforeAll(() => {
  (WalletService.getLocalWallet as jest.Mock).mockResolvedValue(testWallet);
});

beforeEach(() => {
  jest.clearAllMocks();
  (WalletService.getLocalWallet as jest.Mock).mockResolvedValue(testWallet);
});

describe('signPayload', () => {
  it('returns a signature with r, s, and v fields', async () => {
    const sig = await signPayload(FROM, TO, '1.0', 0);
    expect(sig).toHaveProperty('r');
    expect(sig).toHaveProperty('s');
    expect(sig).toHaveProperty('v');
  });

  it('r and s are 32-byte hex strings', async () => {
    const sig = await signPayload(FROM, TO, '1.0', 0);
    expect(sig.r).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(sig.s).toMatch(/^0x[0-9a-fA-F]{64}$/);
  });

  it('v is 27 or 28', async () => {
    const sig = await signPayload(FROM, TO, '1.0', 0);
    expect([27, 28]).toContain(sig.v);
  });

  it('produces the same signature for the same inputs', async () => {
    const sig1 = await signPayload(FROM, TO, '1.0', 0);
    const sig2 = await signPayload(FROM, TO, '1.0', 0);
    expect(sig1.r).toBe(sig2.r);
    expect(sig1.s).toBe(sig2.s);
    expect(sig1.v).toBe(sig2.v);
  });

  it('produces different signatures for different nonces', async () => {
    const sig1 = await signPayload(FROM, TO, '1.0', 0);
    const sig2 = await signPayload(FROM, TO, '1.0', 1);
    expect(sig1.r).not.toBe(sig2.r);
  });

  it('produces different signatures for different amounts', async () => {
    const sig1 = await signPayload(FROM, TO, '1.0', 0);
    const sig2 = await signPayload(FROM, TO, '2.0', 0);
    expect(sig1.r).not.toBe(sig2.r);
  });

  it('produces different signatures for different recipients', async () => {
    const otherTo = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
    const sig1 = await signPayload(FROM, TO, '1.0', 0);
    const sig2 = await signPayload(FROM, otherTo, '1.0', 0);
    expect(sig1.r).not.toBe(sig2.r);
  });

  it('calls WalletService.getLocalWallet to retrieve the signer', async () => {
    await signPayload(FROM, TO, '1.0', 0);
    expect(WalletService.getLocalWallet).toHaveBeenCalledTimes(1);
  });
});
