import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTodayGuidance } from '@/hooks/today/useTodayGuidance';
import type { Expense } from '@/types/Expense';

let monthlyBudget: number | null = 1000;

vi.mock('@/contexts/DataContext', () => ({
  useIncomesData: () => [],
  useCategoriesData: () => ({ expenseCategories: [] }),
  useRecurringData: () => ({ recurringExpenses: [] }),
  useDataConfig: () => ({ monthlyBudget, defaultCurrency: 'EUR' }),
}));

vi.mock('@/hooks/useDateLocale', () => ({ useDateLocale: () => undefined }));
vi.mock('@/hooks/useSpendingInsights', () => ({
  useSpendingInsights: () => [],
}));

const spend = (
  id: string,
  amount: number,
  date: string,
  recurringId: string | null = null,
): Expense =>
  ({
    id,
    amount,
    date,
    description: id,
    created_at: `${date}T09:00:00Z`,
    recurring_expense_id: recurringId,
  }) as unknown as Expense;

const atDay = (day: number) => {
  vi.setSystemTime(
    new Date(`2026-08-${String(day).padStart(2, '0')}T12:00:00Z`),
  );
};

describe('useTodayGuidance pace', () => {
  beforeEach(() => {
    monthlyBudget = 1000;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // The regression this model exists to kill: rent generated on the 1st used
  // to read as "60% of budget gone on day 1" and warned for over a fortnight.
  it.each([1, 5, 10, 16, 20])(
    'stays comfortable on day %i when only a recurring bill has landed',
    (day) => {
      atDay(day);
      const { result } = renderHook(() =>
        useTodayGuidance([spend('rent', 600, '2026-08-01', 'r1')]),
      );

      expect(result.current.status).toBe('comfortable');
    },
  );

  it('still warns when everyday spending genuinely runs ahead', () => {
    atDay(10);
    const { result } = renderHook(() =>
      useTodayGuidance([
        spend('rent', 600, '2026-08-01', 'r1'),
        spend('splurge', 200, '2026-08-02'),
      ]),
    );

    // 200 of a 400 everyday budget = 50% by day 10 (32% of the month).
    expect(result.current.status).toBe('watchful');
  });

  it('measures progress against the everyday budget, not the gross one', () => {
    atDay(10);
    const { result } = renderHook(() =>
      useTodayGuidance([
        spend('rent', 600, '2026-08-01', 'r1'),
        spend('coffee', 40, '2026-08-02'),
      ]),
    );

    expect(result.current.everydayBudget).toBe(400);
    expect(Math.round(result.current.everydayProgress)).toBe(10);
    expect(result.current.spentThisMonth).toBe(640);
  });

  it('goes tight when the plan is genuinely blown', () => {
    atDay(10);
    const { result } = renderHook(() =>
      useTodayGuidance([spend('big', 1200, '2026-08-02')]),
    );

    expect(result.current.status).toBe('tight');
    expect(result.current.safeToSpend).toBe(-200);
  });

  it('does not invent a warning when fixed costs eat the whole budget', () => {
    atDay(3);
    const { result } = renderHook(() =>
      useTodayGuidance([spend('rent', 1000, '2026-08-01', 'r1')]),
    );

    expect(result.current.everydayBudget).toBe(0);
    expect(result.current.status).toBe('comfortable');
  });

  it('reports noBudget when no budget is set', () => {
    monthlyBudget = null;
    atDay(10);
    const { result } = renderHook(() =>
      useTodayGuidance([spend('coffee', 40, '2026-08-02')]),
    );

    expect(result.current.status).toBe('noBudget');
    expect(result.current.safeToSpend).toBeNull();
  });

  it('compares against the same day of last month, not the whole of it', () => {
    atDay(10);
    const { result } = renderHook(() =>
      useTodayGuidance([
        spend('now', 100, '2026-08-05'),
        spend('then-early', 60, '2026-07-05'),
        spend('then-late', 500, '2026-07-25'),
      ]),
    );

    // Only the 5 July row falls on or before day 10.
    expect(result.current.spentLastMonthToDate).toBe(60);
  });

  it('paces on everyday spend only', () => {
    atDay(3);
    const { result } = renderHook(() =>
      useTodayGuidance([
        spend('rent', 600, '2026-08-01', 'r1'),
        spend('lunch', 40, '2026-08-02'),
      ]),
    );

    // 40 of the 400 everyday budget — the 600 rent is absent from the pace.
    expect(Math.round(result.current.everydayProgress)).toBe(10);
  });
});
