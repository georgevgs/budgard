import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { format } from 'date-fns';
import { useCurrentMonthSpendingByCategory } from './useCurrentMonthSpendingByCategory';
import type { Expense } from '@/types/Expense';

const thisMonth = (day: number) =>
  `${format(new Date(), 'yyyy-MM')}-${String(day).padStart(2, '0')}`;

const make = (partial: Partial<Expense>): Expense =>
  ({
    id: partial.id ?? 'e1',
    user_id: 'u1',
    amount: 0,
    description: '',
    date: partial.date ?? thisMonth(15),
    category_id: undefined,
    created_at: '',
    receipt_path: null,
    ...partial,
  }) as Expense;

describe('useCurrentMonthSpendingByCategory', () => {
  it('sums expenses by category for the current month', () => {
    const expenses = [
      make({ id: 'a', amount: 10, category_id: 'c1' }),
      make({ id: 'b', amount: 25, category_id: 'c1' }),
      make({ id: 'c', amount: 5, category_id: 'c2' }),
    ];

    const { result } = renderHook(() =>
      useCurrentMonthSpendingByCategory(expenses),
    );

    expect(result.current.get('c1')).toBe(35);
    expect(result.current.get('c2')).toBe(5);
  });

  it('ignores expenses outside the current month', () => {
    const expenses = [
      make({ id: 'a', amount: 100, category_id: 'c1', date: '2020-01-15' }),
      make({ id: 'b', amount: 50, category_id: 'c1' }),
    ];

    const { result } = renderHook(() =>
      useCurrentMonthSpendingByCategory(expenses),
    );

    expect(result.current.get('c1')).toBe(50);
  });

  it('skips uncategorised expenses', () => {
    const expenses = [
      make({ id: 'a', amount: 10, category_id: undefined }),
      make({ id: 'b', amount: 20, category_id: 'c1' }),
    ];

    const { result } = renderHook(() =>
      useCurrentMonthSpendingByCategory(expenses),
    );

    expect(result.current.has('c1')).toBe(true);
    expect(result.current.size).toBe(1);
  });

  it('returns an empty map for an empty list', () => {
    const { result } = renderHook(() =>
      useCurrentMonthSpendingByCategory([]),
    );

    expect(result.current.size).toBe(0);
  });
});
