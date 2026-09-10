import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// vi.mock factories are hoisted, so anything read eagerly is built by vi.hoisted.

const mockToast = vi.hoisted(() => vi.fn());
vi.mock('@/common/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockSentry = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock('@/config/sentry', () => mockSentry);

const auth = vi.hoisted(() => ({
  session: { user: { id: 'u1' } } as { user: { id: string } } | null,
  isLoading: false,
  ownerId: null as string | null,
}));
vi.mock('@/common/contexts/AuthContext', () => ({ useAuth: () => auth }));

vi.mock('@/common/contexts/FinancialSpaceContext', () => ({
  useFinancialSpace: () => ({
    activeOwnerId: auth.ownerId ?? auth.session?.user.id ?? '',
  }),
}));

const cache = vi.hoisted(() => ({
  loadDataSnapshot: vi.fn(() => null),
  hasDataSnapshot: vi.fn(() => false),
  saveDataSnapshot: vi.fn(),
  clearDataSnapshot: vi.fn(),
  // Fixed cutoff so the recent and on-demand windows are deterministic.
  getRecentCutoff: vi.fn(() => '2026-01-01'),
}));
vi.mock('@/constants/dataCache', () => cache);

const svc = vi.hoisted(() => {
  const fn = <T>(value: T) => vi.fn(async () => value);

  return {
    getCategories: fn([{ id: 'cat1', type: 'expense' }]),
    // Declared with the real four-arg shape (ownerId, signal, sinceDate,
    // beforeDate) so `calls[i][3]` (the history beforeDate) is typed rather
    // than an empty tuple.
    getExpenses: vi.fn(
      async (
        _ownerId?: unknown,
        _signal?: unknown,
        _since?: unknown,
        _before?: unknown,
      ) => [{ id: 'e-recent', date: '2026-08-01' }],
    ),
    getIncomes: vi.fn(
      async (
        _ownerId?: unknown,
        _signal?: unknown,
        _since?: unknown,
        _before?: unknown,
      ) => [{ id: 'i-recent', date: '2026-08-01' }],
    ),
    getRecurringExpenses: fn([]),
    getRecurringIncomes: fn([]),
    getBudget: fn({
      monthly_amount: 1000,
      default_currency: 'EUR',
      default_savings_pct: 10,
    }),
    getNotificationSettings: fn({
      daily_reminder_hour: null,
      notification_preferences: {},
    }),
    getTags: fn([]),
    getTemplates: fn([]),
    getCategoryBudgets: fn([]),
    getAccounts: fn([]),
    getNoSpendDays: fn([]),
    getGoals: fn([{ id: 'g1' }]),
    getAllAccountBalances: fn([{ id: 'b1' }]),
    getDebts: fn([{ id: 'd1' }]),
    refreshDebtBalances: vi.fn(async () => undefined),
  };
});
vi.mock('@/common/api/dataService', () => ({ dataService: svc }));

import { useDataLayer } from '@/common/hooks/data/useDataLayer';
import { EMPTY_DATA, toSnapshot } from '@/common/hooks/data/dataReducer';
import { DataProvider } from '@/common/contexts/DataProvider';
import { useExpensesData } from '@/common/contexts/DataContext';
import { useOnDemandHistory } from '@/common/hooks/data/useOnDemandHistory';
import { useOnDemandData } from '@/common/components/onDemandData/hooks/useOnDemandData';

// getExpenses/getIncomes take the owner id first, then (signal, sinceDate,
// beforeDate). Boot asks for the recent window (a `sinceDate`); loadHistory
// asks for the tail before it (a `beforeDate` in the fourth argument).
const stage2Calls = (mock: typeof svc.getExpenses) =>
  mock.mock.calls.filter((c) => c[3] !== undefined);

const olderExpenses = [{ id: 'e-old', date: '2025-03-01' }];
const olderIncomes = [{ id: 'i-old', date: '2025-03-01' }];

// getExpenses serves the recent window on a `sinceDate` call and the tail on a
// `beforeDate` call, which is how the real on-demand fetch is shaped.
const twoStageExpenses = () =>
  vi.fn(
    async (
      _ownerId?: unknown,
      _signal?: unknown,
      _since?: unknown,
      before?: unknown,
    ) => {
      if (before !== undefined) return olderExpenses;
      if (_since === undefined)
        return [...olderExpenses, { id: 'e-recent', date: '2026-08-01' }];

      return [{ id: 'e-recent', date: '2026-08-01' }];
    },
  );

const twoStageIncomes = () =>
  vi.fn(
    async (
      _ownerId?: unknown,
      _signal?: unknown,
      _since?: unknown,
      before?: unknown,
    ) => {
      if (before !== undefined) return olderIncomes;
      if (_since === undefined)
        return [...olderIncomes, { id: 'i-recent', date: '2026-08-01' }];

      return [{ id: 'i-recent', date: '2026-08-01' }];
    },
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.session = { user: { id: 'u1' } };
  auth.isLoading = false;
  auth.ownerId = null;
  cache.loadDataSnapshot.mockReturnValue(null);
  cache.hasDataSnapshot.mockReturnValue(false);
  cache.getRecentCutoff.mockReturnValue('2026-01-01');
  svc.getExpenses = twoStageExpenses() as typeof svc.getExpenses;
  svc.getIncomes = twoStageIncomes() as typeof svc.getIncomes;
  svc.refreshDebtBalances.mockResolvedValue(undefined);
  // Rebuilt per test rather than adjusted with mockImplementationOnce: the
  // deferred-stage cases below need every call to a domain to be slow or to
  // fail, so that a regression folding one back into the essential batch is
  // caught rather than served by the leftover default.
  svc.getTemplates = vi.fn(async () => []) as typeof svc.getTemplates;
  svc.getNotificationSettings = vi.fn(async () => ({
    daily_reminder_hour: null,
    notification_preferences: {},
  })) as typeof svc.getNotificationSettings;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useDataLayer boot fetch', () => {
  it('leaves form, notification and account history reads until requested', async () => {
    const { result } = renderHook(() => useDataLayer());
    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );

    expect(svc.getTemplates).not.toHaveBeenCalled();
    expect(svc.getNotificationSettings).not.toHaveBeenCalled();
    expect(svc.getAllAccountBalances).not.toHaveBeenCalled();
    expect(result.current.accountsSlice.accounts).toEqual([]);
    expect(result.current.debts).toHaveLength(1);
  });

  it('keeps finance fresh on resume without repeating successful daily accrual', async () => {
    const clock = vi
      .spyOn(Date, 'now')
      .mockReturnValue(Date.parse('2026-09-10T10:00:00Z'));
    const { result } = renderHook(() => useDataLayer());
    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );
    setVisibility('hidden');
    clock.mockReturnValue(Date.parse('2026-09-10T10:01:00Z'));
    setVisibility('visible');
    await waitFor(() => expect(svc.getDebts).toHaveBeenCalledTimes(2));

    expect(svc.getExpenses).toHaveBeenCalledTimes(2);
    expect(svc.getBudget).toHaveBeenCalledTimes(2);
    expect(svc.refreshDebtBalances).toHaveBeenCalledTimes(1);
  });

  it('stage 1 initialises the app with the recent window', async () => {
    const { result } = renderHook(() => useDataLayer());

    await waitFor(() => expect(result.current.config.isInitialized).toBe(true));

    expect(result.current.categoriesSlice.categories).toHaveLength(1);
    expect(result.current.config.monthlyBudget).toBe(1000);
    expect(result.current.config.defaultCurrency).toBe('EUR');
    expect(result.current.expenses.map((e) => e.id)).toContain('e-recent');
    expect(result.current.config.isHistoryLoaded).toBe(false);
    expect(stage2Calls(svc.getExpenses)).toHaveLength(0);
  });

  it('stage 1.5 loads the secondary domains without blocking stage 1', async () => {
    const { result } = renderHook(() => useDataLayer());

    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );

    expect(result.current.goals).toHaveLength(1);
    expect(result.current.debts).toHaveLength(1);
    expect(result.current.accountsSlice.accountBalances).toHaveLength(0);
    // Interest is accrued before the balances are read.
    expect(svc.refreshDebtBalances).toHaveBeenCalled();
  });

  it('starts the deferred domains without waiting for the essential batch', async () => {
    const pending = deferred<Awaited<ReturnType<typeof svc.getExpenses>>>();
    svc.getExpenses.mockImplementationOnce(() => pending.promise);

    renderHook(() => useDataLayer());

    // Still blocked on the essential batch, yet already asking for the rest:
    // deferring these must not cost them a round trip.
    await waitFor(() => expect(svc.getAccounts).toHaveBeenCalled());
    expect(svc.getGoals).toHaveBeenCalled();
    expect(svc.getTemplates).not.toHaveBeenCalled();
    expect(svc.getNotificationSettings).not.toHaveBeenCalled();

    await act(async () =>
      pending.resolve([{ id: 'e-recent', date: '2026-08-01' }]),
    );
  });

  it('initialises the dashboard even when a deferred read is slow', async () => {
    // A settings read that never lands used to hold back every expense on
    // screen, because it shared one Promise.all with them.
    svc.getNotificationSettings.mockImplementation(
      () => deferred<never>().promise,
    );

    const { result } = renderHook(() => useDataLayer());

    await waitFor(() => expect(result.current.config.isInitialized).toBe(true));
    expect(result.current.expenses.map((e) => e.id)).toContain('e-recent');
  });

  it('initialises the dashboard even when a deferred read fails', async () => {
    svc.getGoals.mockRejectedValueOnce(new Error('goals down'));

    const { result } = renderHook(() => useDataLayer());

    await waitFor(() => expect(result.current.config.isInitialized).toBe(true));
    // The dashboard is whole; only the deferred domains are missing, and they
    // report themselves as still loading rather than as empty.
    expect(result.current.categoriesSlice.categories).toHaveLength(1);
    expect(result.current.config.isSecondaryLoaded).toBe(false);
    expect(mockToast).toHaveBeenCalled();
    await waitFor(() => expect(mockSentry.captureException).toHaveBeenCalled());
  });

  it('still loads debts when the interest refresh fails', async () => {
    svc.refreshDebtBalances.mockRejectedValue(new Error('accrual down'));

    const { result } = renderHook(() => useDataLayer());

    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );
    expect(result.current.debts).toHaveLength(1);
  });

  it('loads the pre-cutoff tail only when requested', async () => {
    const { result } = renderHook(() => useDataLayer());

    await waitFor(() => expect(result.current.config.isInitialized).toBe(true));
    expect(stage2Calls(svc.getExpenses)).toHaveLength(0);

    await act(async () => {
      await result.current.actions.loadHistory();
    });

    const ids = result.current.expenses.map((e) => e.id);
    expect(ids).toContain('e-recent');
    expect(ids).toContain('e-old');
    expect(result.current.incomes.map((i) => i.id)).toContain('i-old');
  });

  it('deduplicates history loads and keeps the tail on a refetch', async () => {
    const { result } = renderHook(() => useDataLayer());

    await waitFor(() => expect(result.current.config.isInitialized).toBe(true));
    await act(async () => {
      await Promise.all([
        result.current.actions.loadHistory(),
        result.current.actions.loadHistory(),
      ]);
    });
    expect(stage2Calls(svc.getExpenses)).toHaveLength(1);

    await act(async () => {
      await result.current.actions.refreshData();
    });

    // The full refresh includes history in its main read, without a separate tail request.
    expect(stage2Calls(svc.getExpenses)).toHaveLength(1);
    // ...and the tail already in state survives the refetch.
    expect(result.current.expenses.map((e) => e.id)).toContain('e-old');
    expect(result.current.expenses.map((e) => e.id)).toContain('e-recent');
  });

  it('reports a load failure with a retry action', async () => {
    svc.getCategories.mockRejectedValueOnce(new Error('server down'));

    renderHook(() => useDataLayer());

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        action: expect.objectContaining({ onClick: expect.any(Function) }),
      }),
    );
  });

  it('stays silent when the request is aborted', async () => {
    svc.getCategories.mockRejectedValueOnce(
      new DOMException('aborted', 'AbortError'),
    );

    renderHook(() => useDataLayer());

    await new Promise((r) => setTimeout(r, 20));
    expect(mockToast).not.toHaveBeenCalled();
    expect(mockSentry.captureException).not.toHaveBeenCalled();
  });

  it('stays silent when the JWT has expired', async () => {
    svc.getCategories.mockRejectedValueOnce(new Error('JWT expired'));

    renderHook(() => useDataLayer());

    await new Promise((r) => setTimeout(r, 20));
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('does not alarm the user when cached data is already on screen', async () => {
    // A snapshot is showing, so a failed first fetch leaves a usable view.
    cache.hasDataSnapshot.mockReturnValue(true);
    cache.loadDataSnapshot.mockReturnValue({
      expenses: [{ id: 'cached' }],
      incomes: [],
      categories: [],
    } as never);
    svc.getCategories.mockRejectedValueOnce(new Error('server down'));

    renderHook(() => useDataLayer());

    await new Promise((r) => setTimeout(r, 20));
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('does not fetch when signed out', async () => {
    auth.session = null;

    renderHook(() => useDataLayer());

    await new Promise((r) => setTimeout(r, 20));
    expect(svc.getCategories).not.toHaveBeenCalled();
  });

  it('marks history loaded even when the tail fails to arrive', async () => {
    svc.getExpenses = vi.fn(
      async (
        _ownerId?: unknown,
        _signal?: unknown,
        _since?: unknown,
        before?: unknown,
      ) => {
        if (before !== undefined) throw new Error('tail down');

        return [{ id: 'e-recent', date: '2026-08-01' }];
      },
    ) as typeof svc.getExpenses;

    const { result } = renderHook(() => useDataLayer());

    await waitFor(() => expect(result.current.config.isInitialized).toBe(true));
    await act(async () => {
      await result.current.actions.loadHistory();
    });

    // Screens must fall back to their empty state rather than wait forever.
    expect(result.current.config.isHistoryLoaded).toBe(true);
  });

  it('keeps a routine expense refresh inside the recent window', async () => {
    const { result } = renderHook(() => useDataLayer());

    await waitFor(() => expect(result.current.config.isInitialized).toBe(true));
    svc.getExpenses.mockClear();

    await act(async () => {
      await result.current.actions.refreshExpenses();
    });

    expect(svc.getExpenses).toHaveBeenCalledWith('u1', undefined, '2026-01-01');
  });
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });

  return { promise, resolve, reject };
};

const setVisibility = (visibility: DocumentVisibilityState) => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visibility);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
};

describe('on-demand data freshness', () => {
  it('removes server-deleted older transactions when refreshing loaded history', async () => {
    const { result } = renderHook(() => useDataLayer());
    await waitFor(() => expect(result.current.config.isInitialized).toBe(true));
    await act(async () => result.current.actions.loadHistory());
    expect(result.current.expenses.map((row) => row.id)).toContain('e-old');
    svc.getExpenses.mockResolvedValueOnce([
      { id: 'e-recent', date: '2026-08-01' },
    ]);
    await act(async () => result.current.actions.refreshData());
    expect(result.current.expenses.map((row) => row.id)).not.toContain('e-old');
    expect(svc.getExpenses).toHaveBeenLastCalledWith(
      'u1',
      expect.any(AbortSignal),
      undefined,
    );
  });

  it('shares a pending read, reuses it briefly and revalidates on a later open', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(100_000);
    const pending = deferred<never[]>();
    svc.getTemplates.mockImplementationOnce(() => pending.promise);
    const { result } = renderHook(() => useDataLayer());
    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );
    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => {
      first = result.current.actions.loadOptionalData('templates');
      second = result.current.actions.loadOptionalData('templates');
    });
    expect(svc.getTemplates).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve([]);
      await Promise.all([first, second]);
      await result.current.actions.loadOptionalData('templates');
    });
    expect(svc.getTemplates).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(131_000);
    await act(async () => result.current.actions.loadOptionalData('templates'));
    expect(svc.getTemplates).toHaveBeenCalledTimes(2);
    await act(async () => result.current.actions.refreshData());
    expect(svc.getTemplates).toHaveBeenCalledTimes(3);
    expect(svc.getNotificationSettings).not.toHaveBeenCalled();
  });

  it('does not treat a failed optional read as fresh', async () => {
    svc.getTemplates.mockRejectedValueOnce(new Error('templates down'));
    const { result } = renderHook(() => useDataLayer());
    await waitFor(() => expect(result.current.config.isInitialized).toBe(true));
    await act(async () => {
      await expect(
        result.current.actions.loadOptionalData('templates'),
      ).rejects.toThrow('templates down');
      await result.current.actions.loadOptionalData('templates');
    });
    expect(svc.getTemplates).toHaveBeenCalledTimes(2);
  });

  it('discards optional data after switching financial spaces', async () => {
    const pending = deferred<never[]>();
    svc.getTemplates.mockImplementationOnce(() => pending.promise);
    const { result, rerender } = renderHook(() => useDataLayer());
    await waitFor(() => expect(result.current.config.isInitialized).toBe(true));
    let loading!: Promise<unknown>;
    await act(async () => {
      loading = result.current.actions
        .loadOptionalData('templates')
        .catch((error: unknown) => error);
    });
    auth.ownerId = 'partner';
    rerender();
    await act(async () => {
      pending.resolve([{ id: 'private-old-template' }] as never[]);
      await loading;
    });
    expect(result.current.templates).toEqual([]);
    await act(async () => result.current.actions.loadOptionalData('templates'));
    expect(svc.getTemplates).toHaveBeenLastCalledWith(
      'partner',
      expect.any(AbortSignal),
    );
  });

  it('uses a known cached domain offline and revalidates it when online again', async () => {
    cache.loadDataSnapshot.mockReturnValue({
      ...toSnapshot(EMPTY_DATA),
      loadedOptionalDomains: ['templates'],
    } as never);
    svc.getTemplates.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useOnDemandData('templates'), {
      wrapper: DataProvider,
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(svc.getTemplates).toHaveBeenCalledTimes(2));
    expect(result.current.status).toBe('ready');
  });

  it('reports unavailable optional data instead of showing empty defaults offline', async () => {
    cache.loadDataSnapshot.mockReturnValue({
      ...toSnapshot(EMPTY_DATA),
      loadedOptionalDomains: [],
    } as never);
    svc.getNotificationSettings.mockRejectedValueOnce(
      new TypeError('Failed to fetch'),
    );
    const { result } = renderHook(() => useOnDemandData('notifications'), {
      wrapper: DataProvider,
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('recovers an interrupted deferred boot even when primary data already landed', async () => {
    const pending = deferred<Awaited<ReturnType<typeof svc.getGoals>>>();
    svc.getGoals.mockImplementationOnce(() => pending.promise);
    const { result } = renderHook(() => useDataLayer());
    await waitFor(() => expect(result.current.config.isInitialized).toBe(true));
    expect(result.current.config.isSecondaryLoaded).toBe(false);
    setVisibility('hidden');
    setVisibility('visible');
    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );
    await act(async () => pending.resolve([{ id: 'old-goal' }]));
    expect(result.current.goals.map((goal) => goal.id)).toEqual(['g1']);
  });

  it('accrues again at UTC midnight and on explicit refresh', async () => {
    const clock = vi
      .spyOn(Date, 'now')
      .mockReturnValue(Date.parse('2026-09-10T23:59:00Z'));
    const { result } = renderHook(() => useDataLayer());
    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );
    setVisibility('hidden');
    clock.mockReturnValue(Date.parse('2026-09-11T00:01:00Z'));
    setVisibility('visible');
    await waitFor(() => expect(svc.getDebts).toHaveBeenCalledTimes(2));
    expect(svc.refreshDebtBalances).toHaveBeenCalledTimes(2);
    await act(async () => result.current.actions.refreshData());
    expect(svc.refreshDebtBalances).toHaveBeenCalledTimes(3);
  });
});

describe('useDataLayer session lifecycle', () => {
  it('waits for auth and does not reboot on a token refresh', async () => {
    auth.isLoading = true;
    const { result, rerender } = renderHook(() => useDataLayer());
    expect(svc.getCategories).not.toHaveBeenCalled();
    auth.isLoading = false;
    rerender();
    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );
    const actions = result.current.actions;
    auth.session = { user: { id: 'u1' } };
    rerender();
    expect(svc.getCategories).toHaveBeenCalledTimes(1);
    expect(result.current.actions).toBe(actions);
  });

  it('keeps actions and unrelated slices stable while updating mutation refs', async () => {
    const { result } = renderHook(() => useDataLayer());
    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );
    const before = result.current;
    act(() => {
      before.actions.setExpenses((rows) => [
        { ...rows[0], id: 'optimistic' },
        ...rows,
      ]);
      before.actions.setIncomes((rows) => [
        { ...rows[0], id: 'income-optimistic' },
        ...rows,
      ]);
    });
    expect(result.current.actions).toBe(before.actions);
    expect(result.current.config).toBe(before.config);
    expect(result.current.categoriesSlice).toBe(before.categoriesSlice);
    expect(result.current.recurringSlice).toBe(before.recurringSlice);
    expect(result.current.accountsSlice).toBe(before.accountsSlice);
    expect(before.actions.expensesRef.current[0].id).toBe('optimistic');
    expect(before.actions.incomesRef.current[0].id).toBe('income-optimistic');
  });

  it('hydrates before the first paint and loads history requested by a cached child', async () => {
    const pending = deferred<Awaited<ReturnType<typeof svc.getExpenses>>>();
    svc.getExpenses.mockImplementationOnce(() => pending.promise);
    cache.loadDataSnapshot.mockReturnValue({
      ...toSnapshot(EMPTY_DATA),
      expenses: [{ id: 'cached', date: '2026-08-01' }],
    } as never);
    cache.hasDataSnapshot.mockReturnValue(true);
    const { result } = renderHook(
      () => {
        useOnDemandHistory(true);

        return useExpensesData();
      },
      { wrapper: DataProvider },
    );
    expect(result.current.map((row) => row.id)).toEqual(['cached']);
    await waitFor(() =>
      expect(result.current.map((row) => row.id)).toContain('e-old'),
    );
    await act(async () =>
      pending.resolve([{ id: 'fresh', date: '2026-08-01' }]),
    );
    expect(result.current.map((row) => row.id)).toEqual(['fresh', 'e-old']);
  });

  it.each(['resolve', 'reject'] as const)(
    'ignores a primary fetch that settles with %s after sign-out',
    async (settle) => {
      const pending = deferred<Awaited<ReturnType<typeof svc.getExpenses>>>();
      svc.getExpenses.mockImplementationOnce(() => pending.promise);
      const { result, rerender } = renderHook(() => useDataLayer());
      const signal = svc.getExpenses.mock.calls[0][1] as AbortSignal;
      auth.session = null;
      rerender();
      expect(signal.aborted).toBe(true);
      await act(async () => {
        if (settle === 'resolve')
          pending.resolve([{ id: 'late', date: '2026-08-01' }]);
        else pending.reject(new Error('late failure'));
      });
      expect(result.current.expenses).toEqual([]);
      expect(result.current.config.isInitialized).toBe(false);
      // The deferred stage goes out with the essential batch rather than
      // after it, so what keeps its results out of state is the aborted
      // signal, not a start it never got to.
      expect(result.current.goals).toEqual([]);
      expect(result.current.config.isSecondaryLoaded).toBe(false);
      expect(mockToast).not.toHaveBeenCalled();
      expect(mockSentry.captureException).not.toHaveBeenCalled();
      expect(cache.clearDataSnapshot).toHaveBeenCalled();
    },
  );

  it('clears the old space immediately and prevents its late fetch replacing the new space', async () => {
    const { result, rerender } = renderHook(() => useDataLayer());
    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );
    const oldRefresh = deferred<Awaited<ReturnType<typeof svc.getExpenses>>>();
    svc.getExpenses.mockImplementationOnce(() => oldRefresh.promise);
    let refreshing!: Promise<void>;
    await act(async () => {
      refreshing = result.current.actions.refreshData();
    });
    const newBoot = deferred<Awaited<ReturnType<typeof svc.getExpenses>>>();
    svc.getExpenses.mockImplementationOnce(() => newBoot.promise);
    auth.ownerId = 'household-owner';
    rerender();
    expect(result.current.expenses).toEqual([]);
    expect(result.current.config.monthlyBudget).toBeNull();
    expect(result.current.config.isHistoryLoaded).toBe(false);
    expect(cache.loadDataSnapshot).toHaveBeenLastCalledWith(
      'u1:household-owner',
    );
    expect(svc.getExpenses).toHaveBeenLastCalledWith(
      'household-owner',
      expect.any(AbortSignal),
      '2026-01-01',
    );
    await act(async () =>
      newBoot.resolve([{ id: 'household', date: '2026-08-01' }]),
    );
    await act(async () => {
      oldRefresh.resolve([{ id: 'old-space', date: '2026-08-01' }]);
      await refreshing;
    });
    expect(result.current.expenses.map((row) => row.id)).toEqual(['household']);
  });

  it('ignores secondary results and history failures after sign-out', async () => {
    const secondary = deferred<Awaited<ReturnType<typeof svc.getGoals>>>();
    svc.getGoals.mockImplementationOnce(() => secondary.promise);
    const { result, rerender } = renderHook(() => useDataLayer());
    await waitFor(() => expect(result.current.config.isInitialized).toBe(true));
    const history = deferred<Awaited<ReturnType<typeof svc.getExpenses>>>();
    svc.getExpenses.mockImplementationOnce(() => history.promise);
    let loading!: Promise<void>;
    await act(async () => {
      loading = result.current.actions.loadHistory();
    });
    auth.session = null;
    rerender();
    await act(async () => {
      secondary.resolve([{ id: 'late-goal' }]);
      history.reject(new Error('late history failure'));
      await loading;
    });
    expect(result.current.goals).toEqual([]);
    expect(result.current.config.isSecondaryLoaded).toBe(false);
    expect(result.current.config.isHistoryLoaded).toBe(false);
    expect(mockSentry.captureException).not.toHaveBeenCalled();
  });

  it.each([
    ['refreshExpenses', 'getExpenses'],
    ['refreshIncomes', 'getIncomes'],
    ['refreshAccounts', 'getAccounts'],
    ['refreshDebts', 'getDebts'],
  ] as const)(
    'discards %s results when its session ends',
    async (action, method) => {
      const { result, rerender } = renderHook(() => useDataLayer());
      await waitFor(() =>
        expect(result.current.config.isSecondaryLoaded).toBe(true),
      );
      const pending = deferred<never[]>();
      svc[method].mockImplementationOnce(() => pending.promise);
      let refreshing!: Promise<void>;
      await act(async () => {
        refreshing = result.current.actions[action]();
      });
      auth.session = null;
      rerender();
      await act(async () => {
        pending.resolve([{ id: 'late', date: '2026-08-01' }] as never[]);
        await refreshing;
      });
      expect(result.current.expenses).toEqual([]);
      expect(result.current.incomes).toEqual([]);
      expect(result.current.accountsSlice).toEqual({
        accounts: [],
        accountBalances: [],
      });
      expect(result.current.debts).toEqual([]);
    },
  );

  it.each(['refreshData', 'refreshExpenses'] as const)(
    'retries %s while active and makes its old retry harmless after sign-out',
    async (action) => {
      const { result, rerender } = renderHook(() => useDataLayer());
      await waitFor(() =>
        expect(result.current.config.isSecondaryLoaded).toBe(true),
      );
      svc.getExpenses.mockRejectedValueOnce(new Error('refresh failed'));
      await act(async () => {
        await result.current.actions[action]();
      });
      const retry = mockToast.mock.lastCall?.[0].action.onClick;
      expect(retry).toBeTypeOf('function');
      const calls = svc.getExpenses.mock.calls.length;
      await act(async () => retry());
      expect(svc.getExpenses).toHaveBeenCalledTimes(calls + 1);
      auth.session = null;
      rerender();
      await act(async () => retry());
      expect(svc.getExpenses).toHaveBeenCalledTimes(calls + 1);
    },
  );

  it('aborts both fetches on unmount and removes visibility listeners', async () => {
    const pending = deferred<Awaited<ReturnType<typeof svc.getExpenses>>>();
    svc.getExpenses.mockImplementation(() => pending.promise);
    const { result, unmount } = renderHook(() => useDataLayer());
    let loading!: Promise<void>;
    await act(async () => {
      loading = result.current.actions.loadHistory();
    });
    const signals = svc.getExpenses.mock.calls.map(
      (call) => call[1] as AbortSignal,
    );
    expect(signals).toHaveLength(2);
    unmount();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    setVisibility('hidden');
    setVisibility('visible');
    expect(svc.getExpenses).toHaveBeenCalledTimes(2);
    expect(cache.saveDataSnapshot).not.toHaveBeenCalled();
    await act(async () => {
      pending.resolve([]);
      await loading;
    });
  });

  it('finishes boot after Strict Mode replays the lifecycle effects', async () => {
    const { result } = renderHook(() => useDataLayer(), {
      reactStrictMode: true,
    });
    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );
    const signals = svc.getExpenses.mock.calls.map(
      (call) => call[1] as AbortSignal,
    );
    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    expect(result.current.expenses.map((row) => row.id)).toEqual(['e-recent']);
  });
});

describe('useDataLayer foreground and snapshots', () => {
  it('skips a fresh foreground refresh and fetches after the freshness window', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(100_000);
    const { result } = renderHook(() => useDataLayer());
    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );
    setVisibility('hidden');
    now.mockReturnValue(129_999);
    setVisibility('visible');
    expect(svc.getExpenses).toHaveBeenCalledTimes(1);
    now.mockReturnValue(130_000);
    setVisibility('visible');
    expect(svc.getExpenses).toHaveBeenCalledTimes(2);
    await act(async () => {});
    expect(stage2Calls(svc.getExpenses)).toHaveLength(0);
  });

  it('restarts an aborted primary refresh even before its rejection arrives', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(100_000);
    const { result } = renderHook(() => useDataLayer());
    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );
    const pending = deferred<Awaited<ReturnType<typeof svc.getExpenses>>>();
    svc.getExpenses.mockImplementationOnce(() => pending.promise);
    let refreshing!: Promise<void>;
    await act(async () => {
      refreshing = result.current.actions.refreshData();
    });
    setVisibility('hidden');
    setVisibility('visible');
    expect(svc.getExpenses).toHaveBeenCalledTimes(3);
    await act(async () => {
      pending.reject(new DOMException('aborted', 'AbortError'));
      await refreshing;
    });
    expect(mockToast).not.toHaveBeenCalled();
    expect(result.current.expenses.map((row) => row.id)).toEqual(['e-recent']);
  });

  it('resumes requested history and keeps the replacement load deduplicated', async () => {
    const { result } = renderHook(() => useDataLayer());
    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );
    const oldTail = deferred<Awaited<ReturnType<typeof svc.getExpenses>>>();
    const newTail = deferred<Awaited<ReturnType<typeof svc.getExpenses>>>();
    svc.getExpenses
      .mockImplementationOnce(() => oldTail.promise)
      .mockImplementationOnce(() => newTail.promise);
    let oldLoad!: Promise<void>;
    await act(async () => {
      oldLoad = result.current.actions.loadHistory();
    });
    setVisibility('hidden');
    setVisibility('visible');
    expect(stage2Calls(svc.getExpenses)).toHaveLength(2);
    await act(async () => {
      oldTail.resolve([{ id: 'cancelled-tail', date: '2025-03-01' }]);
      await oldLoad;
    });
    let sameLoad!: Promise<void>;
    await act(async () => {
      sameLoad = result.current.actions.loadHistory();
    });
    expect(stage2Calls(svc.getExpenses)).toHaveLength(2);
    await act(async () => {
      newTail.resolve(olderExpenses);
      await sameLoad;
    });
    expect(result.current.expenses.map((row) => row.id)).toEqual([
      'e-recent',
      'e-old',
    ]);
  });

  it.each(['refreshExpenses', 'refreshIncomes'] as const)(
    '%s reconciles the full history once the tail is loaded',
    async (action) => {
      const { result } = renderHook(() => useDataLayer());
      await waitFor(() =>
        expect(result.current.config.isSecondaryLoaded).toBe(true),
      );
      await act(async () => {
        await result.current.actions.loadHistory();
      });
      const method =
        action === 'refreshExpenses' ? svc.getExpenses : svc.getIncomes;
      method.mockResolvedValueOnce([
        { id: 'only-server-row', date: '2025-03-01' },
      ]);
      await act(async () => {
        await result.current.actions[action]();
      });
      expect(method).toHaveBeenLastCalledWith('u1', undefined, undefined);
      const rows =
        action === 'refreshExpenses'
          ? result.current.expenses
          : result.current.incomes;
      expect(rows.map((row) => row.id)).toEqual(['only-server-row']);
    },
  );

  it('debounces snapshots using the latest mutation and flushes them on hide', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { result } = renderHook(() => useDataLayer());
    await act(async () => {});
    expect(result.current.config.isSecondaryLoaded).toBe(true);
    act(() => vi.advanceTimersByTime(1999));
    expect(cache.saveDataSnapshot).not.toHaveBeenCalled();
    act(() => result.current.actions.setMonthlyBudget(2500));
    act(() => vi.advanceTimersByTime(1999));
    expect(cache.saveDataSnapshot).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(cache.saveDataSnapshot).toHaveBeenCalledTimes(1);
    expect(cache.saveDataSnapshot).toHaveBeenLastCalledWith(
      'u1:u1',
      expect.objectContaining({ monthlyBudget: 2500, secondaryLoaded: true }),
    );
    act(() => result.current.actions.setMonthlyBudget(3000));
    setVisibility('hidden');
    expect(cache.saveDataSnapshot).toHaveBeenLastCalledWith(
      'u1:u1',
      expect.objectContaining({ monthlyBudget: 3000 }),
    );
  });

  it('cancels pending snapshot writes on sign-out', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { result, rerender } = renderHook(() => useDataLayer());
    await act(async () => {});
    expect(result.current.config.isInitialized).toBe(true);
    auth.session = null;
    rerender();
    act(() => vi.advanceTimersByTime(2000));
    setVisibility('hidden');
    expect(cache.saveDataSnapshot).not.toHaveBeenCalled();
    expect(cache.clearDataSnapshot).toHaveBeenCalled();
  });
});
