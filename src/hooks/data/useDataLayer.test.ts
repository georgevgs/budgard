import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// --- Mocks ---
// vi.mock factories are hoisted, so anything read eagerly is built by vi.hoisted.

const mockToast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));

const mockSentry = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock('@/lib/sentry', () => mockSentry);

const auth = vi.hoisted(() => ({
  session: { user: { id: 'u1' } } as { user: { id: string } } | null,
  isLoading: false,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

vi.mock('@/contexts/FinancialSpaceContext', () => ({
  useFinancialSpace: () => ({ activeOwnerId: auth.session?.user.id ?? '' }),
}));

const cache = vi.hoisted(() => ({
  loadDataSnapshot: vi.fn(() => null),
  hasDataSnapshot: vi.fn(() => false),
  saveDataSnapshot: vi.fn(),
  clearDataSnapshot: vi.fn(),
  // Fixed cutoff so the two-stage window is deterministic.
  getRecentCutoff: vi.fn(() => '2026-01-01'),
}));
vi.mock('@/lib/dataCache', () => cache);

const svc = vi.hoisted(() => {
  const fn = <T>(value: T) => vi.fn(async () => value);

  return {
    getCategories: fn([{ id: 'cat1', type: 'expense' }]),
    // Declared with the real four-arg shape (ownerId, signal, sinceDate,
    // beforeDate) so `calls[i][3]` (the stage-2 beforeDate) is typed rather
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
vi.mock('@/services/dataService', () => ({ dataService: svc }));

import { useDataLayer } from '@/hooks/data/useDataLayer';

// --- Helpers ---

// getExpenses/getIncomes take the owner id first, then (signal, sinceDate,
// beforeDate). Stage 1 asks for the recent window (a `sinceDate`); stage 2
// asks for the tail before it (a `beforeDate` in the fourth argument).
const stage2Calls = (mock: typeof svc.getExpenses) =>
  mock.mock.calls.filter((c) => c[3] !== undefined);

const olderExpenses = [{ id: 'e-old', date: '2025-03-01' }];
const olderIncomes = [{ id: 'i-old', date: '2025-03-01' }];

// getExpenses serves the recent window on a `sinceDate` call and the tail on a
// `beforeDate` call, which is how the real two-stage fetch is shaped.
const twoStageExpenses = () =>
  vi.fn(
    async (
      _ownerId?: unknown,
      _signal?: unknown,
      _since?: unknown,
      before?: unknown,
    ) => {
      if (before !== undefined) return olderExpenses;

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

      return [{ id: 'i-recent', date: '2026-08-01' }];
    },
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.session = { user: { id: 'u1' } };
  auth.isLoading = false;
  cache.loadDataSnapshot.mockReturnValue(null);
  cache.hasDataSnapshot.mockReturnValue(false);
  cache.getRecentCutoff.mockReturnValue('2026-01-01');
  svc.getExpenses = twoStageExpenses() as typeof svc.getExpenses;
  svc.getIncomes = twoStageIncomes() as typeof svc.getIncomes;
  svc.refreshDebtBalances.mockResolvedValue(undefined);
});

describe('useDataLayer boot fetch', () => {
  it('stage 1 initialises the app with the recent window', async () => {
    const { result } = renderHook(() => useDataLayer());

    await waitFor(() => expect(result.current.config.isInitialized).toBe(true));

    expect(result.current.categoriesSlice.categories).toHaveLength(1);
    expect(result.current.config.monthlyBudget).toBe(1000);
    expect(result.current.config.defaultCurrency).toBe('EUR');
    expect(result.current.expenses.map((e) => e.id)).toContain('e-recent');
  });

  it('stage 1.5 loads the secondary domains without blocking stage 1', async () => {
    const { result } = renderHook(() => useDataLayer());

    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );

    expect(result.current.goals).toHaveLength(1);
    expect(result.current.debts).toHaveLength(1);
    expect(result.current.accountsSlice.accountBalances).toHaveLength(1);
    // Interest is accrued before the balances are read.
    expect(svc.refreshDebtBalances).toHaveBeenCalled();
  });

  it('still loads debts when the interest refresh fails', async () => {
    svc.refreshDebtBalances.mockRejectedValue(new Error('accrual down'));

    const { result } = renderHook(() => useDataLayer());

    await waitFor(() =>
      expect(result.current.config.isSecondaryLoaded).toBe(true),
    );
    expect(result.current.debts).toHaveLength(1);
  });

  it('stage 2 appends the pre-cutoff tail and marks history loaded', async () => {
    const { result } = renderHook(() => useDataLayer());

    await waitFor(() =>
      expect(result.current.config.isHistoryLoaded).toBe(true),
    );

    const ids = result.current.expenses.map((e) => e.id);
    expect(ids).toContain('e-recent');
    expect(ids).toContain('e-old');
    expect(result.current.incomes.map((i) => i.id)).toContain('i-old');
  });

  it('runs stage 2 once per boot and keeps the tail on a refetch', async () => {
    const { result } = renderHook(() => useDataLayer());

    await waitFor(() =>
      expect(result.current.config.isHistoryLoaded).toBe(true),
    );
    expect(stage2Calls(svc.getExpenses)).toHaveLength(1);

    await act(async () => {
      await result.current.actions.refreshData();
    });

    // No second tail download...
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

    // Screens must fall back to their empty state rather than wait forever.
    await waitFor(() =>
      expect(result.current.config.isHistoryLoaded).toBe(true),
    );
  });
});
