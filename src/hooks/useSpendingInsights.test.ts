import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { format, subDays } from 'date-fns';
import { useSpendingInsights } from './useSpendingInsights';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

const categories: Category[] = [
  {
    id: 'cat-1',
    name: 'Food',
    color: '#F00',
    icon: null,
    user_id: 'u1',
    created_at: '',
  },
];

const makeExpense = (date: string, amount: number): Expense => ({
  id: crypto.randomUUID(),
  date,
  amount,
  description: 'Test',
  category_id: 'cat-1',
  user_id: 'u1',
  created_at: date + 'T10:00:00Z',
});

const baselineRun = (
  categoryId: string,
  amount: number,
  count: number,
  refDate: Date,
): Expense[] => {
  const start = subDays(refDate, 8);
  const step = Math.max(1, Math.floor(85 / count));

  return Array.from({ length: count }, (_, i) =>
    makeExpense(format(subDays(start, i * step), 'yyyy-MM-dd'), amount),
  ).map((e) => ({ ...e, category_id: categoryId }));
};

describe('useSpendingInsights', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-03-15'));
  });

  const render = (
    overrides: Partial<Parameters<typeof useSpendingInsights>[0]> = {},
  ) =>
    renderHook(() =>
      useSpendingInsights({
        expenses: [],
        monthlyBudget: null,
        monthComparison: { thisMonthAmount: 0, lastMonthAmount: 0 },
        categories,
        defaultCurrency: 'EUR',
        ...overrides,
      }),
    );

  it('returns empty array when no expenses', () => {
    const { result } = render();
    expect(result.current).toEqual([]);
  });

  // --- Daily Budget Remaining ---

  it('returns daily budget remaining when a budget is set and there is headroom', () => {
    const { result } = render({
      expenses: [makeExpense('2026-03-01', 100)],
      monthlyBudget: 500,
      monthComparison: { thisMonthAmount: 100, lastMonthAmount: 0 },
    });
    const insight = result.current.find((i) => i.id === 'dailyBudgetRemaining');
    expect(insight).toBeDefined();
    expect(insight!.variant).toBe('positive');
  });

  it('flags budget exceeded when spending overshoots the cap', () => {
    const { result } = render({
      expenses: [makeExpense('2026-03-01', 600)],
      monthlyBudget: 500,
      monthComparison: { thisMonthAmount: 600, lastMonthAmount: 0 },
    });
    const insight = result.current.find((i) => i.id === 'dailyBudgetRemaining');
    expect(insight).toBeDefined();
    expect(insight!.variant).toBe('warning');
  });

  it('omits daily budget when no monthly budget is set', () => {
    const { result } = render({
      expenses: [makeExpense('2026-03-01', 100)],
      monthlyBudget: null,
    });
    expect(
      result.current.find((i) => i.id === 'dailyBudgetRemaining'),
    ).toBeUndefined();
  });

  // --- Spending Pace ---

  it('warns when budget % exceeds time %', () => {
    // Day 15 of 31 => ~48% time progress. Spending 80% of €500 budget => well ahead.
    const { result } = render({
      expenses: [makeExpense('2026-03-01', 400)],
      monthlyBudget: 500,
      monthComparison: { thisMonthAmount: 400, lastMonthAmount: 0 },
    });
    const insight = result.current.find((i) => i.id === 'spendingPace');
    expect(insight).toBeDefined();
    expect(insight!.variant).toBe('warning');
  });

  it('reassures when budget % is well below time %', () => {
    const { result } = render({
      expenses: [makeExpense('2026-03-01', 50)],
      monthlyBudget: 500,
      monthComparison: { thisMonthAmount: 50, lastMonthAmount: 0 },
    });
    const insight = result.current.find((i) => i.id === 'spendingPace');
    expect(insight).toBeDefined();
    expect(insight!.variant).toBe('positive');
  });

  // --- Month Projection ---

  it('shows month projection when daily rate implies overshoot', () => {
    const { result } = render({
      expenses: [makeExpense('2026-03-01', 500)],
      monthComparison: { thisMonthAmount: 500, lastMonthAmount: 0 },
    });
    const insight = result.current.find((i) => i.id === 'monthProjection');
    expect(insight).toBeDefined();
    expect(insight!.variant).toBe('warning');
  });

  // --- Weekly Anomaly ---

  it('surfaces a weekly anomaly as a warning insight', () => {
    const today = new Date('2026-03-15');
    const expenses: Expense[] = [
      ...baselineRun('cat-1', 30, 12, today),
      makeExpense(format(today, 'yyyy-MM-dd'), 80),
    ];

    const { result } = render({ expenses });
    const anomaly = result.current.find((i) => i.id === 'weeklyAnomalyUp');
    expect(anomaly).toBeDefined();
    expect(anomaly!.variant).toBe('warning');
  });
});
