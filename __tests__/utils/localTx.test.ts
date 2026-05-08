import { SignedPayload } from '../../types/types';
import {
  clearAllSignedTx,
  deleteSignedTx,
  getSignedTxList,
  saveSignedTx,
  updateTxStatus,
} from '../../utils/localTx';

jest.mock('@react-native-async-storage/async-storage');

const makeTx = (overrides: Partial<SignedPayload> = {}): SignedPayload => ({
  uuid: 'test-uuid-1',
  from: '0xFromAddress',
  to: '0xToAddress',
  amount: '1000000000000000000',
  nonce: 0,
  status: 'PENDING',
  isOwner: true,
  signature: { r: '0xaabbcc', s: '0xddeeff', v: 27 },
  signedAt: 1000000,
  ...overrides,
});

describe('localTx', () => {
  beforeEach(async () => {
    await clearAllSignedTx();
    jest.clearAllMocks();
  });

  describe('getSignedTxList', () => {
    it('returns empty array when storage is empty', async () => {
      const list = await getSignedTxList();
      expect(list).toEqual([]);
    });

    it('returns the stored list after a save', async () => {
      const tx = makeTx();
      await saveSignedTx(tx);
      const list = await getSignedTxList();
      expect(list).toHaveLength(1);
      expect(list[0]).toEqual(tx);
    });
  });

  describe('saveSignedTx', () => {
    it('prepends new transactions to the top of the list', async () => {
      const tx1 = makeTx({ uuid: 'uuid-1' });
      const tx2 = makeTx({ uuid: 'uuid-2' });
      await saveSignedTx(tx1);
      await saveSignedTx(tx2);
      const list = await getSignedTxList();
      expect(list[0].uuid).toBe('uuid-2');
      expect(list[1].uuid).toBe('uuid-1');
    });

    it('preserves all fields on the saved transaction', async () => {
      const tx = makeTx({ uuid: 'preserve-uuid', amount: '500000000000000000', nonce: 3 });
      await saveSignedTx(tx);
      const list = await getSignedTxList();
      expect(list[0]).toEqual(tx);
    });
  });

  describe('updateTxStatus', () => {
    it('updates the status of the matching transaction', async () => {
      await saveSignedTx(makeTx({ uuid: 'update-uuid', status: 'PENDING' }));
      await updateTxStatus('update-uuid', 'SUCCESS');
      const list = await getSignedTxList();
      expect(list[0].status).toBe('SUCCESS');
    });

    it('does not change status of other transactions', async () => {
      await saveSignedTx(makeTx({ uuid: 'uuid-a', status: 'PENDING' }));
      await saveSignedTx(makeTx({ uuid: 'uuid-b', status: 'PENDING' }));
      await updateTxStatus('uuid-a', 'FAILED');
      const list = await getSignedTxList();
      const txB = list.find((t) => t.uuid === 'uuid-b');
      expect(txB?.status).toBe('PENDING');
    });

    it('does not crash when uuid is not found', async () => {
      await saveSignedTx(makeTx({ uuid: 'existing' }));
      await expect(updateTxStatus('nonexistent', 'SUCCESS')).resolves.not.toThrow();
      const list = await getSignedTxList();
      expect(list).toHaveLength(1);
    });
  });

  describe('deleteSignedTx', () => {
    it('removes the transaction with the matching uuid', async () => {
      await saveSignedTx(makeTx({ uuid: 'del-uuid' }));
      await saveSignedTx(makeTx({ uuid: 'keep-uuid' }));
      await deleteSignedTx('del-uuid');
      const list = await getSignedTxList();
      expect(list).toHaveLength(1);
      expect(list[0].uuid).toBe('keep-uuid');
    });

    it('leaves the list unchanged when uuid is not found', async () => {
      await saveSignedTx(makeTx({ uuid: 'existing-uuid' }));
      await deleteSignedTx('nonexistent-uuid');
      const list = await getSignedTxList();
      expect(list).toHaveLength(1);
    });
  });

  describe('clearAllSignedTx', () => {
    it('empties the transaction list', async () => {
      await saveSignedTx(makeTx({ uuid: 'uuid-1' }));
      await saveSignedTx(makeTx({ uuid: 'uuid-2' }));
      await clearAllSignedTx();
      const list = await getSignedTxList();
      expect(list).toEqual([]);
    });

    it('resolves without error on an already-empty list', async () => {
      await expect(clearAllSignedTx()).resolves.not.toThrow();
    });
  });
});
