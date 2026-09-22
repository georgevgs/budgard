import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecurringSuggestion } from '@/pages/recurring/recurringTypes';

const data = vi.hoisted(() => ({
  expenses: [],
  incomes: [],
  recurringExpenses: [],
  recurringIncomes: [],
}));
vi.mock('@/common/contexts/DataContext', () => ({
  useExpensesData: () => data.expenses,
  useIncomesData: () => data.incomes,
  useRecurringData: () => ({
    recurringExpenses: data.recurringExpenses,
    recurringIncomes: data.recurringIncomes,
  }),
}));

const financialSpace = vi.hoisted(() => ({ activeOwnerId: 'owner-1' }));
vi.mock('@/common/contexts/FinancialSpaceContext', () => ({
  useFinancialSpace: () => financialSpace,
}));

const expenseOps = vi.hoisted(() => ({
  handleRecurringExpenseSubmit: vi.fn(),
}));
vi.mock('@/common/hooks/dataOps/useRecurringExpenseOps', () => ({
  useRecurringExpenseOps: () => expenseOps,
}));

const incomeOps = vi.hoisted(() => ({
  handleRecurringIncomeSubmit: vi.fn(),
}));
vi.mock('@/common/hooks/dataOps/useRecurringIncomeOps', () => ({
  useRecurringIncomeOps: () => incomeOps,
}));

vi.mock('@/common/hooks/dataOps/useMutationRunner', () => ({
  useMutationRunner: () => vi.fn(),
}));
vi.mock('@/common/hooks/useProGate', () => ({
  useProGate: () => ({ allow: vi.fn(() => true) }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: vi.fn() }),
}));
vi.mock('@/config/sentry', () => ({ captureException: vi.fn() }));

const service = vi.hoisted(() => ({
  getDismissals: vi.fn(),
  dismiss: vi.fn(),
}));
vi.mock('@/common/api/recurringSuggestionService', () => ({
  recurringSuggestionService: service,
}));

const detection = vi.hoisted(() => ({ detectRecurringSuggestions: vi.fn() }));
vi.mock('@/pages/recurring/utils/recurringDetection', () => detection);

import { useRecurringSuggestions } from '@/pages/recurring/hooks/useRecurringSuggestions';

const SUGGESTION: RecurringSuggestion = {
  fingerprint: 'expense:monthly:rent',
  description: 'Rent',
  merchantPattern: 'rent',
  amount: 900,
  frequency: 'monthly',
  type: 'expense',
  categoryId: null,
  nextDate: '2026-10-01',
  occurrences: 3,
};

const dismissal = {
  user_id: 'owner-1',
  fingerprint: SUGGESTION.fingerprint,
  dismissed_by: 'member-1',
  created_at: '2026-09-22T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  service.getDismissals.mockReset();
  service.dismiss.mockReset();
  financialSpace.activeOwnerId = 'owner-1';
  detection.detectRecurringSuggestions.mockImplementation(
    (_transactions, _recurring, dismissed: ReadonlySet<string>) =>
      dismissed.has(SUGGESTION.fingerprint) ? [] : [SUGGESTION],
  );
});

describe('useRecurringSuggestions', () => {
  it('does not reveal a dismissed suggestion while dismissals load', async () => {
    let resolveDismissals: (rows: (typeof dismissal)[]) => void = () =>
      undefined;
    service.getDismissals.mockReturnValue(
      new Promise<(typeof dismissal)[]>((resolve) => {
        resolveDismissals = resolve;
      }),
    );

    const { result } = renderHook(() => useRecurringSuggestions('expense'));

    expect(result.current.suggestions).toEqual([]);

    await act(async () => resolveDismissals([dismissal]));

    expect(result.current.suggestions).toEqual([]);
  });

  it('shows a suggestion after loading confirms it was not dismissed', async () => {
    let resolveDismissals: (rows: (typeof dismissal)[]) => void = () =>
      undefined;
    service.getDismissals.mockReturnValue(
      new Promise<(typeof dismissal)[]>((resolve) => {
        resolveDismissals = resolve;
      }),
    );

    const { result } = renderHook(() => useRecurringSuggestions('expense'));

    expect(result.current.suggestions).toEqual([]);
    await act(async () => resolveDismissals([]));
    expect(result.current.suggestions).toEqual([SUGGESTION]);
  });

  it('hides the previous owner suggestions while the next owner loads', async () => {
    let resolveFirstOwner: (rows: (typeof dismissal)[]) => void = () =>
      undefined;
    let resolveNextOwner: (rows: (typeof dismissal)[]) => void = () =>
      undefined;
    service.getDismissals
      .mockReturnValueOnce(
        new Promise<(typeof dismissal)[]>((resolve) => {
          resolveFirstOwner = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise<(typeof dismissal)[]>((resolve) => {
          resolveNextOwner = resolve;
        }),
      );
    const { result, rerender } = renderHook(() =>
      useRecurringSuggestions('expense'),
    );
    await act(async () => resolveFirstOwner([]));
    expect(result.current.suggestions).toEqual([SUGGESTION]);

    financialSpace.activeOwnerId = 'owner-2';
    rerender();

    expect(result.current.suggestions).toEqual([]);

    await act(async () =>
      resolveNextOwner([{ ...dismissal, user_id: 'owner-2' }]),
    );
    expect(result.current.suggestions).toEqual([]);
  });

  it('reports a load failure and retries without revealing suggestions', async () => {
    let rejectDismissals: (reason: Error) => void = () => undefined;
    let resolveRetry: (rows: (typeof dismissal)[]) => void = () => undefined;
    service.getDismissals
      .mockReturnValueOnce(
        new Promise<(typeof dismissal)[]>((_resolve, reject) => {
          rejectDismissals = reject;
        }),
      )
      .mockReturnValueOnce(
        new Promise<(typeof dismissal)[]>((resolve) => {
          resolveRetry = resolve;
        }),
      );

    const { result } = renderHook(() => useRecurringSuggestions('expense'));

    await act(async () => rejectDismissals(new Error('network unavailable')));
    expect(result.current.hasLoadError).toBe(true);
    expect(result.current.suggestions).toEqual([]);

    act(() => result.current.retry());

    expect(result.current.hasLoadError).toBe(false);
    expect(result.current.suggestions).toEqual([]);
    await act(async () => resolveRetry([]));
    expect(result.current.suggestions).toEqual([SUGGESTION]);
    expect(service.getDismissals).toHaveBeenCalledTimes(2);
  });
});
