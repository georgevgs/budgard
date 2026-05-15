import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSpendingInsights } from './useSpendingInsights';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import { enUS } from 'date-fns/locale';

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
        dateLocale: enUS,
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
});
