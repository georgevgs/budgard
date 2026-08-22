import { getCurrentUserId } from '@/lib/authStore';

/**
 * Queue of writes made while offline, replayed once the server is reachable.
 *
 * Every entry records the user who made it. IndexedDB is per-device, not
 * per-account, and the queue outlives a sign-out — so without an owner stamp
 * the entries are simply "whatever is pending on this device", and the next
 * person to sign in drains them. `expenses.user_id` defaults to `auth.uid()`,
 * so a replayed create lands in whoever is signed in *now*, not whoever wrote
 * it: user A's groceries would appear in user B's ledger, and A would lose
 * them. Reads are scoped to the current user so that cannot happen.
 *
 * Scoping rather than clearing on sign-out is deliberate. A queued row is the
 * only copy that exists — the server has never seen it — so dropping it at
 * sign-out would destroy user data to solve a problem that ownership already
 * solves. Signing back in replays exactly what you left behind.
 */

const DB_NAME = 'budgard-offline';
// v2 added the userId stamp. See onupgradeneeded for what happens to entries
// written before it.
const DB_VERSION = 2;
const STORE_NAME = 'mutations';

// Fired on the window after the queue gains or loses entries so UI (e.g. the
// "pending sync" pill) can re-read the count without polling.
export const OFFLINE_QUEUE_CHANGED_EVENT = 'budgard-offline-queue-changed';

// Only the mutation types that are actually enqueued + handled by useOfflineSync
// live here. Adding a type without a matching sync `case` would let it be
// silently dropped, so the two must stay in lock-step.
export type MutationType =
  | 'createExpense'
  | 'updateExpense'
  | 'deleteExpense'
  | 'createIncome'
  | 'updateIncome'
  | 'deleteIncome';

export type QueuedMutation = {
  id: number;
  type: MutationType;
  // Who wrote this. Null only for an entry queued with no session, which
  // cannot be attributed and is therefore never replayed for anyone.
  userId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  // Number of failed sync attempts due to a *permanent* (non-connectivity)
  // error. Lets useOfflineSync drop a poison message instead of deadlocking.
  retries?: number;
};

const TEMP_ID_PREFIX = 'temp-';

// Optimistic id for an offline-created row. Includes a random suffix so two
// creates in the same millisecond can't collide (which would break reconcile).
export const createTempId = (): string =>
  `${TEMP_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isTempId = (id: string): boolean => id.startsWith(TEMP_ID_PREFIX);

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });

        return;
      }

      // Entries written before v2 carry no owner. Stamping them with whoever
      // happens to trigger the upgrade would recreate the exact bug the stamp
      // exists to prevent — on a shared device that is the *next* person to
      // sign in, not the author. They cannot be attributed, so they go. The
      // window is small (a queue is only non-empty while a write is waiting
      // on the network) and losing a pending row beats filing it under a
      // stranger's account.
      if (event.oldVersion < 2) {
        request.transaction?.objectStore(STORE_NAME).clear();
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const offlineQueue = {
  async enqueue(
    type: MutationType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const db = await openDb();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.add({
      type,
      userId: getCurrentUserId(),
      payload,
      createdAt: new Date().toISOString(),
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        notifyChanged();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  },

  // Enqueue, but first collapse chains that act on a not-yet-synced offline
  // create (identified by its temp id). An edit folds into the pending create;
  // a delete cancels it out entirely — so the server never sees an op for an id
  // it was never told about.
  async enqueueWithReconcile(
    type: MutationType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    return serialized(() => reconcileThenEnqueue(type, payload));
  },

  // Only the signed-in user's own entries. Every other read — the sync pass,
  // the create/edit coalescing, the pending count — is built on this, so the
  // ownership check has exactly one home.
  async getAll(): Promise<QueuedMutation[]> {
    const all = await offlineQueue.getAllForAnyUser();
    const currentUserId = getCurrentUserId();
    if (currentUserId === null) {
      return [];
    }

    return all.filter((mutation) => mutation.userId === currentUserId);
  },

  // Ownership-blind read. Only for maintenance that must see the whole store
  // (tests, diagnostics) — never for replay.
  async getAllForAnyUser(): Promise<QueuedMutation[]> {
    const db = await openDb();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        resolve(request.result as QueuedMutation[]);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  },

  // Read-modify-write a single queued mutation (payload merge / retry count).
  async update(
    id: number,
    patch: { payload?: Record<string, unknown>; retries?: number },
  ): Promise<void> {
    const db = await openDb();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const existing = getRequest.result as QueuedMutation | undefined;
      if (existing) {
        store.put({ ...existing, ...patch });
      }
    };

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  },

  async remove(id: number): Promise<void> {
    const db = await openDb();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        notifyChanged();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  },

  async clear(): Promise<void> {
    const db = await openDb();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        notifyChanged();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  },

  // Drives the "pending sync" pill, so it counts what this user would actually
  // sync — a store-wide count() would show them someone else's backlog.
  async count(): Promise<number> {
    const mine = await offlineQueue.getAll();

    return mine.length;
  },
};

// --- Helpers ---

// Reconciling is a read-modify-write spread across several IndexedDB
// transactions, and IndexedDB gives no atomicity across them. Two edits to the
// same pending create that overlap at an await both read the pre-merge state,
// and whichever writes second silently discards the other's field. Running
// them through one chain is what makes the whole read-merge-write indivisible.
//
// Only the compound operation needs this. enqueue/update/remove/clear are each
// a single transaction, which IndexedDB already serialises.
let reconcileChain: Promise<unknown> = Promise.resolve();

const serialized = <T>(operation: () => Promise<T>): Promise<T> => {
  // Same callback on both branches: a rejected predecessor must not stop the
  // next caller from running.
  const result = reconcileChain.then(operation, operation);
  // The chain only sequences — it must not retain results, and a rejection
  // here is the caller's to handle, not an unhandled one.
  reconcileChain = result.catch(() => undefined);

  return result;
};

// Collapses a chain acting on a not-yet-synced offline create (identified by
// its temp id): an edit folds into the pending create, a delete cancels it out
// entirely — so the server never sees an op for an id it was never told about.
const reconcileThenEnqueue = async (
  type: MutationType,
  payload: Record<string, unknown>,
): Promise<void> => {
  const op = mutationOp(type);
  const targetId = payload.id;

  if (
    (op === 'update' || op === 'delete') &&
    typeof targetId === 'string' &&
    isTempId(targetId)
  ) {
    const all = await offlineQueue.getAll();
    const pendingCreate = all.find(
      (m) =>
        mutationOp(m.type) === 'create' &&
        mutationEntity(m.type) === mutationEntity(type) &&
        m.payload.__tempId === targetId,
    );

    if (pendingCreate) {
      if (op === 'delete') {
        await offlineQueue.remove(pendingCreate.id);

        return;
      }

      // Merge the edit into the queued create; drop the temp `id` so it never
      // gets sent to the server as a column.
      const { id: _omitId, ...edit } = payload;
      await offlineQueue.update(pendingCreate.id, {
        payload: { ...pendingCreate.payload, ...edit },
      });

      return;
    }
    // No pending create (it already synced) — fall through to a normal enqueue.
  }

  await offlineQueue.enqueue(type, payload);
};

const notifyChanged = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OFFLINE_QUEUE_CHANGED_EVENT));
  }
};

const mutationOp = (type: MutationType): 'create' | 'update' | 'delete' => {
  if (type.startsWith('create')) return 'create';
  if (type.startsWith('update')) return 'update';

  return 'delete';
};

const mutationEntity = (type: MutationType): 'expense' | 'income' => {
  if (type.endsWith('Income')) return 'income';

  return 'expense';
};
