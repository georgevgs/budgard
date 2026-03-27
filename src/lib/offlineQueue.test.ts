import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { offlineQueue } from './offlineQueue';

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
});
