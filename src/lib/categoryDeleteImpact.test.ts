import { describe, expect, it } from 'vitest';
import { getCategoryImpact } from '@/lib/categoryDeleteImpact';
import type { Expense } from '@/types/Expense';

const row = (overrides: Partial<Expense>): Expense =>
  ({
    id: 'x',
    amount: 10,
    description: 'x',
    date: '2026-08-01',
    user_id: 'u',
    created_at: '2026-08-01',
    ...overrides,
  }) as Expense;

describe('getCategoryImpact', () => {
  it('reports no impact for a category nothing points at', () => {
    const impact = getCategoryImpact([row({ category_id: 'other' })], 'c1');

    expect(impact).toEqual({ count: 0, total: 0, earliestDate: null });
  });

  it('counts, sums and finds the earliest date across matching rows only', () => {
    const expenses = [
      row({ category_id: 'c1', amount: 20, date: '2026-03-01' }),
      row({ category_id: 'other', amount: 999, date: '2020-01-01' }),
      row({ category_id: 'c1', amount: 15, date: '2026-01-15' }),
    ];

    expect(getCategoryImpact(expenses, 'c1')).toEqual({
      count: 2,
      total: 35,
      earliestDate: '2026-01-15',
    });
  });

  it('ignores rows with no category', () => {
    const impact = getCategoryImpact([row({ category_id: null })], 'c1');

    expect(impact.count).toBe(0);
  });
});
