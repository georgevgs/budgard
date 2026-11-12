import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMonthlyPosition } from '@/common/hooks/useMonthlyPosition';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';

const data = vi.hoisted(() => ({ debts: [] as unknown[] }));

const SAVINGS_CATEGORY = {
  id: 'savings-cat',
  name: 'Savings',
  kind: 'savings',
  type: 'expense',
} as Category;

vi.mock('@/common/contexts/DataContext', () => ({
  useNoSpendDaysData: () => [],
  useDebtsData: () => data.debts,
  useRecurringData: () => ({ recurringExpenses: [] }),
  useCategoriesData: () => ({ expenseCategories: [SAVINGS_CATEGORY] }),
  useGoalsData: () => [],
  useAccountsData: () => ({ accounts: [] }),
  // A 2000 plan with a 10% savings target: 200 to set aside this month.
  useDataConfig: () => ({
    monthlyBudget: 2000,
    defaultSavingsPct: 10,
    defaultCurrency: 'EUR',
  }),
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
    data.debts = [];
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

  // A loan instalment is not spending, but it has left the budget. Left out,
  // safe-to-spend still offered the 400 that went to the bank.
  it('takes a loan payment out of what is left', () => {
    data.debts = [
      {
        kind: 'auto_loan',
        currency: 'EUR',
        payments: [
          { amount: 400, date: '2026-08-03' },
          { amount: 400, date: '2026-07-03' },
        ],
      },
    ];

    expect(availableWith([groceries])).toBe(2000 - 300 - 200 - 400);
  });

  // The card's purchases are already in the ledger as spending.
  it('leaves a credit card payment out, as a transfer', () => {
    data.debts = [
      {
        kind: 'credit_card',
        currency: 'EUR',
        payments: [{ amount: 400, date: '2026-08-03' }],
      },
    ];

    expect(availableWith([groceries])).toBe(2000 - 300 - 200);
  });

  // Held back before it is paid, like a bill, and counted once after: the
  // figure does not move on the day the payment is logged.
  it('reserves an unpaid loan minimum, and holds steady once it is paid', () => {
    const loan = {
      id: 'd1',
      name: 'Car loan',
      kind: 'auto_loan',
      currency: 'EUR',
      apr: 0,
      minimum_payment: 400,
      current_balance: 5000,
      is_completed: false,
      start_date: '2026-01-25',
    };
    const july = { amount: 400, date: '2026-07-25' };

    data.debts = [{ ...loan, payments: [july] }];
    const before = availableWith([groceries]);
    data.debts = [
      {
        ...loan,
        current_balance: 4600,
        payments: [july, { amount: 400, date: '2026-08-09' }],
      },
    ];

    expect(before).toBe(2000 - 300 - 200 - 400);
    expect(availableWith([groceries])).toBe(before);
  });
});
