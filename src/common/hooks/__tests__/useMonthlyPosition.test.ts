import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMonthlyPosition } from '@/common/hooks/useMonthlyPosition';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';

const SAVINGS_CATEGORY = {
  id: 'savings-cat',
  name: 'Savings',
  kind: 'savings',
  type: 'expense',
} as Category;

vi.mock('@/common/contexts/DataContext', () => ({
  useNoSpendDaysData: () => [],
  useRecurringData: () => ({ recurringExpenses: [] }),
  useCategoriesData: () => ({ expenseCategories: [SAVINGS_CATEGORY] }),
  useGoalsData: () => [],
  useAccountsData: () => ({ accounts: [] }),
  // A 2000 plan with a 10% savings target: 200 to set aside this month.
  useDataConfig: () => ({ monthlyBudget: 2000, defaultSavingsPct: 10 }),
}));

const row = (amount: number, overrides: Partial<Expense> = {}): Expense =>
  ({
    id: `${amount}-${overrides.goal_id ?? overrides.category_id ?? 'x'}`,
    amount,
    date: '2026-08-05',
    description: 'x',
    created_at: '2026-08-05T09:00:00Z',
    recurring_expense_id: null,
    ...overrides,
  }) as unknown as Expense;

const groceries = row(300);

// How invest_goal_surplus writes a transfer to an investment goal.
const investment = (amount: number) =>
  row(amount, { goal_id: 'goal-1', is_excluded: true });

const availableWith = (expenses: Expense[]) => {
  const { result } = renderHook(() => useMonthlyPosition(expenses));

  return result.current.position.available;
};

describe('useMonthlyPosition set-asides', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reserves the savings target before anything is set aside', () => {
    expect(availableWith([groceries])).toBe(2000 - 300 - 200);
  });

  // Moving reserved money to savings is not new spending room. The transfer
  // was left out of `spent` while still shrinking the reserve, so investing
  // 100 used to raise the headline by 100.
  it('does not grow when part of the target is invested', () => {
    expect(availableWith([groceries, investment(100)])).toBe(1500);
  });

  it('matches a savings-category transfer of the same amount', () => {
    const viaCategory = availableWith([
      groceries,
      row(100, { category_id: SAVINGS_CATEGORY.id }),
    ]);

    expect(availableWith([groceries, investment(100)])).toBe(viaCategory);
  });

  it('comes out of the budget once more than the target is invested', () => {
    expect(availableWith([groceries, investment(500)])).toBe(2000 - 300 - 500);
  });
});
