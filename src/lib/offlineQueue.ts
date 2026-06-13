const DB_NAME = 'budgard-offline';
const DB_VERSION = 1;
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

export const isTempId = (id: string): boolean => id.startsWith(TEMP_ID_PREFIX);

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
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
  },

  async getAll(): Promise<QueuedMutation[]> {
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

  async count(): Promise<number> {
    const db = await openDb();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  },
};

// --- Helpers ---

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
