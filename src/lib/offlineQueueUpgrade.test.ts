import { describe, it, expect, beforeAll, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { offlineQueue } from '@/lib/offlineQueue';

// The v1 → v2 upgrade is destructive, so it gets its own file: seeding a v1
// database only works before anything has opened it at v2, and vitest gives
// each file its own fake-indexeddb.

const auth = vi.hoisted(() => ({ userId: 'user-b' as string | null }));

vi.mock('@/lib/authStore', () => ({
  getCurrentUserId: () => auth.userId,
}));

const DB_NAME = 'budgard-offline';
const STORE_NAME = 'mutations';

describe('offlineQueue v1 → v2 upgrade', () => {
  beforeAll(async () => {
    await seedLegacyDatabase();
  });

  it('drops entries that predate the owner stamp', async () => {
    // user-b is signed in, and the legacy row was written by whoever used the
    // device before them. Carrying it over would file a stranger's expense in
    // user-b's ledger the moment the queue drains.
    const everyone = await offlineQueue.getAllForAnyUser();

    expect(everyone).toEqual([]);
  });

  it('still accepts writes after the upgrade', async () => {
    await offlineQueue.enqueue('createExpense', { amount: 3 });

    const mine = await offlineQueue.getAll();
    expect(mine).toHaveLength(1);
    expect(mine[0].userId).toBe('user-b');
    expect(mine[0].payload).toEqual({ amount: 3 });
  });
});

// --- Helpers ---

// Builds the pre-v2 shape: same store, entries with no userId field.
const seedLegacyDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
      });
    };

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).add({
        type: 'createExpense',
        payload: { amount: 99, description: 'Written before v2' },
        createdAt: '2026-08-01T10:00:00.000Z',
      });

      transaction.oncomplete = () => {
        // Must close, or the v2 upgrade blocks on this connection.
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
};
