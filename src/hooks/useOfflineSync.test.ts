import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

// Mock dependencies
const mockRefreshExpenses = vi.fn().mockResolvedValue(undefined);
const mockRefreshIncomes = vi.fn().mockResolvedValue(undefined);
vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({
    refreshExpenses: mockRefreshExpenses,
    refreshIncomes: mockRefreshIncomes,
  }),
  useDataActions: () => ({
    refreshExpenses: mockRefreshExpenses,
    refreshIncomes: mockRefreshIncomes,
  }),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

const mockGetAll = vi.fn();
const mockRemove = vi.fn().mockResolvedValue(undefined);
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockCount = vi.fn().mockResolvedValue(0);
vi.mock('@/lib/offlineQueue', () => ({
  offlineQueue: {
    getAll: () => mockGetAll(),
    remove: (...args: unknown[]) => mockRemove(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    count: () => mockCount(),
  },
}));

const mockCreateExpense = vi.fn();
const mockUpdateExpense = vi.fn();
const mockDeleteExpense = vi.fn();
vi.mock('@/services/dataService', () => ({
  dataService: {
    createExpense: (...args: unknown[]) => mockCreateExpense(...args),
    updateExpense: (...args: unknown[]) => mockUpdateExpense(...args),
    deleteExpense: (...args: unknown[]) => mockDeleteExpense(...args),
  },
}));

describe('useOfflineSync', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });

  it('does nothing when offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    mockGetAll.mockResolvedValue([]);

    renderHook(() => useOfflineSync());
    // Give effect time to run
    await act(async () => {});

    expect(mockGetAll).not.toHaveBeenCalled();
  });

  it('does nothing when queue is empty', async () => {
    mockGetAll.mockResolvedValue([]);

    renderHook(() => useOfflineSync());
    await act(async () => {});

    expect(mockCreateExpense).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('processes createExpense mutations from queue', async () => {
    const mutations = [
      {
        id: 1,
        type: 'createExpense',
        payload: { amount: 10, user_id: 'owner-1' },
        createdAt: '',
      },
    ];
    mockGetAll.mockResolvedValue(mutations);
    mockCreateExpense.mockResolvedValue({});

    renderHook(() => useOfflineSync());
    await act(async () => {});

    expect(mockCreateExpense).toHaveBeenCalledWith(
      { amount: 10, user_id: 'owner-1' },
      'owner-1',
    );
    expect(mockRemove).toHaveBeenCalledWith(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' }),
    );
    expect(mockRefreshExpenses).toHaveBeenCalled();
  });

  it('processes updateExpense mutations', async () => {
    const mutations = [
      {
        id: 2,
        type: 'updateExpense',
        payload: { id: 'e1', amount: 20 },
        createdAt: '',
      },
    ];
    mockGetAll.mockResolvedValue(mutations);
    mockUpdateExpense.mockResolvedValue({});

    renderHook(() => useOfflineSync());
    await act(async () => {});

    expect(mockUpdateExpense).toHaveBeenCalledWith(
      { id: 'e1', amount: 20 },
      'e1',
    );
  });

  it('processes deleteExpense mutations', async () => {
    const mutations = [
      { id: 3, type: 'deleteExpense', payload: { id: 'e2' }, createdAt: '' },
    ];
    mockGetAll.mockResolvedValue(mutations);
    mockDeleteExpense.mockResolvedValue(undefined);

    renderHook(() => useOfflineSync());
    await act(async () => {});

    expect(mockDeleteExpense).toHaveBeenCalledWith('e2');
  });

  it('stops processing on first failure', async () => {
    const mutations = [
      {
        id: 1,
        type: 'createExpense',
        payload: { amount: 10, user_id: 'owner-1' },
        createdAt: '',
      },
      {
        id: 2,
        type: 'createExpense',
        payload: { amount: 20, user_id: 'owner-1' },
        createdAt: '',
      },
    ];
    mockGetAll.mockResolvedValue(mutations);
    mockCreateExpense.mockRejectedValueOnce(new Error('fail'));

    renderHook(() => useOfflineSync());
    await act(async () => {});

    // First mutation attempted and failed
    expect(mockCreateExpense).toHaveBeenCalledTimes(1);
    // Failure toast shown
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });

  it('syncs when online event fires', async () => {
    mockGetAll.mockResolvedValue([]);

    renderHook(() => useOfflineSync());
    await act(async () => {});

    mockGetAll.mockClear();
    mockGetAll.mockResolvedValue([
      {
        id: 5,
        type: 'createExpense',
        payload: { amount: 5, user_id: 'owner-1' },
        createdAt: '',
      },
    ]);
    mockCreateExpense.mockResolvedValue({});

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(mockGetAll).toHaveBeenCalled();
  });

  it('leaves the queue intact when sync fails due to connectivity', async () => {
    mockGetAll.mockResolvedValue([
      {
        id: 7,
        type: 'createExpense',
        payload: { amount: 1, user_id: 'owner-1' },
        createdAt: '',
      },
    ]);
    // Online, but the request fails at the network layer (server unreachable).
    mockCreateExpense.mockRejectedValue(new TypeError('Failed to fetch'));

    renderHook(() => useOfflineSync());
    await act(async () => {});

    // Transient → keep it, don't drop, don't count a retry, don't toast.
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('drops a poison mutation after the retry cap', async () => {
    mockGetAll.mockResolvedValue([
      {
        id: 9,
        type: 'createExpense',
        payload: { amount: 1, user_id: 'owner-1' },
        createdAt: '',
        retries: 4,
      },
    ]);
    // A permanent (non-connectivity) failure that has already been retried.
    mockCreateExpense.mockRejectedValue(new Error('permanent rejection'));

    renderHook(() => useOfflineSync());
    await act(async () => {});

    expect(mockRemove).toHaveBeenCalledWith(9);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });
});
