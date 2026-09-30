import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDailyPace } from '@/pages/today/hooks/useDailyPace';
import type { Expense } from '@/types/Expense';

vi.mock('@/common/contexts/DataContext', () => ({
  useCategoriesData: () => ({
    expenseCategories: [
      { id: 'savings-cat', name: 'Savings', kind: 'savings' },
    ],
  }),
}));

const NOW = new Date(2026, 7, 10, 12);

const row = (
  date: string,
  amount: number,
  overrides: Partial<Expense> = {},
): Expense =>
  ({
    id: `${date}-${amount}`,
    amount,
    date,
    description: 'x',
    created_at: `${date}T09:00:00Z`,
    recurring_expense_id: null,
    ...overrides,
  }) as unknown as Expense;

const dayOf = (
  result: { current: ReturnType<typeof useDailyPace> },
  date: string,
) => result.current.days.find((day) => day.date === date);

describe('useDailyPace', () => {
  it('flags a day of everyday spending above the allowance', () => {
    const { result } = renderHook(() =>
      useDailyPace([row('2026-08-08', 80)], 50, NOW),
    );

    expect(dayOf(result, '2026-08-08')?.isOverPace).toBe(true);
  });

  // The status beside this chart already paces on everyday spend. A bill that
  // was always coming, or money moved into savings, is not a day that ran hot.
  it('leaves recurring bills and savings transfers out of the bars', () => {
    const { result } = renderHook(() =>
      useDailyPace(
        [
          row('2026-08-08', 900, { recurring_expense_id: 'rent' }),
          row('2026-08-09', 300, { category_id: 'savings-cat' }),
        ],
        50,
        NOW,
      ),
    );

    expect(dayOf(result, '2026-08-08')).toMatchObject({
      amount: 0,
      isOverPace: false,
    });
    expect(dayOf(result, '2026-08-09')).toMatchObject({
      amount: 0,
      isOverPace: false,
    });
  });
});
