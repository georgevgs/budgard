import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { swatch } from '@/design/palette';
import type { Expense } from '@/types/Expense';

const data = vi.hoisted(() => ({
  expenses: [] as unknown[],
  incomes: [] as unknown[],
  categories: [] as unknown[],
}));

vi.mock('@/contexts/DataContext', () => ({
  useExpensesData: () => data.expenses,
  useIncomesData: () => data.incomes,
  useCategoriesData: () => ({ expenseCategories: data.categories }),
}));

vi.mock('@/hooks/useDateLocale', () => ({ useDateLocale: () => undefined }));

import {
  useMoneyFlowData,
  UNCATEGORIZED_ID,
  OTHER_ID,
} from '@/hooks/analytics/useMoneyFlowData';

// --- Fixtures ---

const NOW = new Date(2026, 7, 15); // 15 Aug 2026

const row = (
  date: string,
  amount: number,
  overrides: Partial<Expense> = {},
): Expense =>
  ({
    id: `${date}-${amount}-${Math.random()}`,
    date,
    amount,
    category_id: null,
    type: 'expense',
    is_excluded: false,
    description: 'x',
    ...overrides,
  }) as Expense;

const category = (id: string, name: string) => ({
  id,
  name,
  color: '#000',
  icon: null,
});

const render = () => renderHook(() => useMoneyFlowData(NOW)).result;

beforeEach(() => {
  data.expenses = [];
  data.incomes = [];
  data.categories = [category('cat-groceries', 'Groceries')];
});

describe('useMoneyFlowData', () => {
  it('sums income and categorized spend for the given month only', () => {
    data.incomes = [row('2026-08-01', 2000, { type: 'income' })];
    data.expenses = [
      row('2026-08-10', 100, { category_id: 'cat-groceries' }),
      // Outside the month — must not count.
      row('2026-07-10', 999, { category_id: 'cat-groceries' }),
    ];

    const r = render();

    expect(r.current.income).toBe(2000);
    expect(r.current.totalExpenses).toBe(100);
    expect(r.current.categories).toEqual([
      {
        id: 'cat-groceries',
        name: 'Groceries',
        icon: null,
        color: '#000',
        amount: 100,
      },
    ]);
  });

  it('reports a positive savings figure and no deficit when income exceeds spend', () => {
    data.incomes = [row('2026-08-01', 1000, { type: 'income' })];
    data.expenses = [row('2026-08-05', 400, { category_id: 'cat-groceries' })];

    const r = render();

    expect(r.current.savings).toBe(600);
    expect(r.current.isDeficit).toBe(false);
  });

  it('reports a negative savings figure and isDeficit when spend exceeds income', () => {
    data.incomes = [row('2026-08-01', 500, { type: 'income' })];
    data.expenses = [row('2026-08-05', 900, { category_id: 'cat-groceries' })];

    const r = render();

    expect(r.current.savings).toBe(-400);
    expect(r.current.isDeficit).toBe(true);
  });

  it('excludes transfers and debt payments the same way every other total does', () => {
    data.expenses = [
      row('2026-08-05', 100, { category_id: 'cat-groceries' }),
      row('2026-08-06', 50, {
        category_id: 'cat-groceries',
        is_excluded: true,
      }),
      row('2026-08-07', 30, {
        category_id: 'cat-groceries',
        type: 'debt_payment',
      }),
    ];

    const r = render();

    expect(r.current.totalExpenses).toBe(100);
  });

  it('buckets expenses with no category under a synthetic uncategorized row', () => {
    data.expenses = [row('2026-08-05', 75, { category_id: null })];

    const r = render();

    expect(r.current.categories).toEqual([
      {
        id: UNCATEGORIZED_ID,
        name: '',
        icon: null,
        color: swatch.steel,
        amount: 75,
      },
    ]);
  });

  it('folds everything past the top 6 categories into one Other row', () => {
    const categories = Array.from({ length: 9 }, (_, i) =>
      category(`cat-${i}`, `Category ${i}`),
    );
    data.categories = categories;
    // Amount i+1 so sort order is deterministic and predictable.
    data.expenses = categories.map((cat, i) =>
      row('2026-08-05', i + 1, { category_id: cat.id }),
    );

    const r = render();

    expect(r.current.categories).toHaveLength(7);
    const other = r.current.categories.find((c) => c.id === OTHER_ID);
    // The 3 smallest (amounts 1, 2, 3) fold together.
    expect(other?.amount).toBe(6);
  });

  it('reports hasData false when the month is empty', () => {
    const r = render();

    expect(r.current.hasData).toBe(false);
    expect(r.current.categories).toEqual([]);
  });
});
