import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { offlineQueue, OFFLINE_QUEUE_CHANGED_EVENT } from '@/lib/offlineQueue';

describe('offlineQueue', () => {
  beforeEach(async () => {
    await offlineQueue.clear();
  });

  it('starts empty', async () => {
    const count = await offlineQueue.count();
    expect(count).toBe(0);
  });

  it('enqueues a mutation and retrieves it', async () => {
    await offlineQueue.enqueue('createExpense', {
      amount: 10,
      description: 'Test',
    });

    const all = await offlineQueue.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].type).toBe('createExpense');
    expect(all[0].payload).toEqual({ amount: 10, description: 'Test' });
    expect(all[0].createdAt).toBeDefined();
  });

  it('enqueues multiple mutations in order', async () => {
    await offlineQueue.enqueue('createExpense', { id: 1 });
    await offlineQueue.enqueue('updateExpense', { id: 2 });
    await offlineQueue.enqueue('deleteExpense', { id: 3 });

    const all = await offlineQueue.getAll();
    expect(all).toHaveLength(3);
    expect(all[0].type).toBe('createExpense');
    expect(all[1].type).toBe('updateExpense');
    expect(all[2].type).toBe('deleteExpense');
  });

  it('removes a specific mutation by id', async () => {
    await offlineQueue.enqueue('createExpense', { id: 1 });
    await offlineQueue.enqueue('updateExpense', { id: 2 });

    const all = await offlineQueue.getAll();
    await offlineQueue.remove(all[0].id);

    const remaining = await offlineQueue.getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].type).toBe('updateExpense');
  });

  it('clears all mutations', async () => {
    await offlineQueue.enqueue('createExpense', { id: 1 });
    await offlineQueue.enqueue('deleteExpense', { id: 2 });

    await offlineQueue.clear();

    expect(await offlineQueue.count()).toBe(0);
    expect(await offlineQueue.getAll()).toEqual([]);
  });

  it('counts mutations correctly', async () => {
    await offlineQueue.enqueue('createExpense', {});
    await offlineQueue.enqueue('createExpense', {});
    await offlineQueue.enqueue('createExpense', {});

    expect(await offlineQueue.count()).toBe(3);
  });

  it('update() patches retries while preserving other fields', async () => {
    await offlineQueue.enqueue('deleteExpense', { id: 'x' });
    const [m] = await offlineQueue.getAll();

    await offlineQueue.update(m.id, { retries: 3 });

    const [updated] = await offlineQueue.getAll();
    expect(updated.retries).toBe(3);
    expect(updated.type).toBe('deleteExpense');
    expect(updated.payload).toEqual({ id: 'x' });
  });

  describe('enqueueWithReconcile', () => {
    it('folds an offline edit into a not-yet-synced create', async () => {
      await offlineQueue.enqueue('createExpense', {
        __tempId: 'temp-1',
        amount: 10,
        description: 'A',
      });

      await offlineQueue.enqueueWithReconcile('updateExpense', {
        id: 'temp-1',
        amount: 25,
      });

      const all = await offlineQueue.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].type).toBe('createExpense');
      expect(all[0].payload).toMatchObject({
        __tempId: 'temp-1',
        amount: 25,
        description: 'A',
      });
      // The temp id must never be persisted as a real column.
      expect(all[0].payload.id).toBeUndefined();
    });

    it('cancels out a create+delete done entirely offline', async () => {
      await offlineQueue.enqueue('createIncome', {
        __tempId: 'temp-2',
        amount: 5,
      });

      await offlineQueue.enqueueWithReconcile('deleteIncome', { id: 'temp-2' });

      expect(await offlineQueue.count()).toBe(0);
    });

    it('enqueues normally when the target is a real (synced) id', async () => {
      await offlineQueue.enqueueWithReconcile('updateExpense', {
        id: 'real-123',
        amount: 9,
      });

      const all = await offlineQueue.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].type).toBe('updateExpense');
      expect(all[0].payload).toEqual({ id: 'real-123', amount: 9 });
    });

    it('does not cross expense/income when reconciling temp ids', async () => {
      await offlineQueue.enqueue('createExpense', {
        __tempId: 'temp-3',
        amount: 1,
      });

      await offlineQueue.enqueueWithReconcile('deleteIncome', { id: 'temp-3' });

      const types = (await offlineQueue.getAll()).map((m) => m.type).sort();
      expect(types).toEqual(['createExpense', 'deleteIncome']);
    });
  });

  describe('change events', () => {
    it('dispatches on enqueue and remove', async () => {
      const handler = vi.fn();
      window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handler);

      await offlineQueue.enqueue('createExpense', {});
      const [m] = await offlineQueue.getAll();
      await offlineQueue.remove(m.id);

      window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handler);
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});
