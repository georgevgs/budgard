import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSpendingInsights } from './useSpendingInsights';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import { enUS } from 'date-fns/locale';

const categories: Category[] = [
  { id: 'cat-1', name: 'Food', color: '#F00', user_id: 'u1', created_at: '' },
  { id: 'cat-2', name: 'Transport', color: '#0F0', user_id: 'u1', created_at: '' },
  { id: 'cat-3', name: 'Entertainment', color: '#00F', user_id: 'u1', created_at: '' },
];

const makeExpense = (date: string, amount: number, categoryId: string = 'cat-1'): Expense => ({
  id: crypto.randomUUID(),
  date,
  amount,
  description: 'Test',
  category_id: categoryId,
  user_id: 'u1',
  created_at: date + 'T10:00:00Z',
});

const monthExpenses = (yearMonth: string, amounts: number[], categoryId = 'cat-1') =>
  amounts.map((amount, i) =>
    makeExpense(`${yearMonth}-${String(i + 1).padStart(2, '0')}`, amount, categoryId),
  );

describe('useSpendingInsights', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-03-15'));
  });

  const render = (overrides: Partial<Parameters<typeof useSpendingInsights>[0]> = {}) =>
    renderHook(() =>
      useSpendingInsights({
        expenses: [],
        monthlyBudget: null,
        monthComparison: { thisMonthAmount: 0, lastMonthAmount: 0 },
        categories,
        dateLocale: enUS,
        ...overrides,
      }),
    );

  it('returns empty array when no expenses', () => {
    const { result } = render();
    expect(result.current).toEqual([]);
  });

  // --- Largest Expense ---
  it('shows largest expense this month', () => {
    const expenses = [
      makeExpense('2026-03-01', 10),
      makeExpense('2026-03-05', 500),
      makeExpense('2026-03-10', 30),
    ];
    const { result } = render({ expenses });
    const insight = result.current.find((i) => i.id === 'largestExpense');
    expect(insight).toBeDefined();
    expect(insight!.id).toBe('largestExpense');
    expect(insight!.variant).toBe('default');
  });

  // --- Category Concentration ---
  it('shows category concentration when one category dominates', () => {
    const expenses = [
      makeExpense('2026-03-01', 800, 'cat-1'),
      makeExpense('2026-03-02', 100, 'cat-2'),
      makeExpense('2026-03-03', 100, 'cat-3'),
    ];
    const { result } = render({ expenses });
    const insight = result.current.find((i) => i.id === 'categoryConcentration');
    expect(insight).toBeDefined();
  });

  it('does not show concentration when spending is spread evenly', () => {
    // 3 categories, each ~33% — no single category >= 60%
    const expenses = [
      makeExpense('2026-03-01', 100, 'cat-1'),
      makeExpense('2026-03-02', 100, 'cat-2'),
      makeExpense('2026-03-03', 100, 'cat-3'),
    ];
    const { result } = render({ expenses });
    const insight = result.current.find((i) => i.id === 'categoryConcentration');
    expect(insight).toBeUndefined();
  });

  // --- Inactivity ---
  it('shows inactivity warning when last expense is >3 days ago', () => {
    const expenses = [makeExpense('2026-03-01', 10)];
    const { result } = render({ expenses });
    const insight = result.current.find((i) => i.id === 'inactive');
    expect(insight).toBeDefined();
    expect(insight!.variant).toBe('warning');
  });

  it('does not show inactivity for recent expenses', () => {
    const expenses = [makeExpense('2026-03-14', 10)];
    const { result } = render({ expenses });
    expect(result.current.find((i) => i.id === 'inactive')).toBeUndefined();
  });

  // --- Peak Day ---
  it('shows peak spending day when enough data', () => {
    const expenses = Array.from({ length: 20 }, (_, i) =>
      makeExpense(`2026-03-${String((i % 15) + 1).padStart(2, '0')}`, 10 + i),
    );
    const { result } = render({ expenses });
    const insight = result.current.find((i) => i.id === 'peakDay');
    expect(insight).toBeDefined();
  });

  it('does not show peak day with too few expenses', () => {
    const expenses = [makeExpense('2026-03-01', 10)];
    const { result } = render({ expenses });
    expect(result.current.find((i) => i.id === 'peakDay')).toBeUndefined();
  });

  // --- Budget Streak ---
  it('shows budget streak when multiple months under budget', () => {
    const expenses = [
      ...monthExpenses('2026-01', [100, 100]),
      ...monthExpenses('2026-02', [100, 100]),
    ];
    const { result } = render({ expenses, monthlyBudget: 500 });
    const insight = result.current.find((i) => i.id === 'budgetStreak');
    expect(insight).toBeDefined();
    expect(insight!.variant).toBe('positive');
  });

  it('does not show budget streak without a budget', () => {
    const expenses = monthExpenses('2026-02', [100]);
    const { result } = render({ expenses, monthlyBudget: null });
    expect(result.current.find((i) => i.id === 'budgetStreak')).toBeUndefined();
  });

  // --- Month Projection ---
  it('shows month projection when spending rate implies overshoot', () => {
    const { result } = render({
      expenses: [makeExpense('2026-03-01', 100)],
      monthComparison: { thisMonthAmount: 500, lastMonthAmount: 0 },
    });
    const insight = result.current.find((i) => i.id === 'monthProjection');
    expect(insight).toBeDefined();
    expect(insight!.variant).toBe('warning');
  });

  // --- Spending Volatility ---
  it('shows high volatility when monthly totals vary wildly', () => {
    const expenses = [
      ...monthExpenses('2025-09', [100]),
      ...monthExpenses('2025-10', [500]),
      ...monthExpenses('2025-11', [50]),
      ...monthExpenses('2025-12', [800]),
      ...monthExpenses('2026-01', [100]),
      ...monthExpenses('2026-02', [600]),
    ];
    const { result } = render({ expenses });
    const insight = result.current.find((i) => i.id === 'spendingVolatility');
    expect(insight).toBeDefined();
    expect(insight!.variant).toBe('warning');
  });

  it('shows stable spending when monthly totals are consistent', () => {
    const expenses = [
      ...monthExpenses('2025-09', [500]),
      ...monthExpenses('2025-10', [510]),
      ...monthExpenses('2025-11', [490]),
      ...monthExpenses('2025-12', [505]),
      ...monthExpenses('2026-01', [495]),
      ...monthExpenses('2026-02', [500]),
    ];
    const { result } = render({ expenses });
    const insight = result.current.find((i) => i.id === 'spendingStable');
    expect(insight).toBeDefined();
    expect(insight!.variant).toBe('positive');
  });

  // --- Weekend vs Weekday ---
  it('shows weekend spending warning when weekends cost more', () => {
    // 2026-03-01 is Sunday, 2026-03-07 is Saturday
    const expenses = [
      makeExpense('2026-03-01', 200), // Sunday
      makeExpense('2026-03-07', 200), // Saturday
      makeExpense('2026-03-02', 10),  // Monday
      makeExpense('2026-03-03', 10),  // Tuesday
      makeExpense('2026-03-04', 10),  // Wednesday
    ];
    const { result } = render({ expenses });
    const insight = result.current.find((i) => i.id === 'weekendSpending');
    expect(insight).toBeDefined();
    expect(insight!.variant).toBe('warning');
  });
});
