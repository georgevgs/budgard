import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Expense } from '@/types/Expense';

const plan = vi.hoisted(() => ({ isPro: false }));
vi.mock('@/hooks/useIsPro', () => ({ useIsPro: () => plan.isPro }));

const data = vi.hoisted(() => ({
  expenses: [] as unknown[],
  categories: [] as unknown[],
  monthlyBudget: null as number | null,
}));

vi.mock('@/contexts/DataContext', () => ({
  useExpensesData: () => data.expenses,
  useCategoriesData: () => ({ expenseCategories: data.categories }),
  useDataConfig: () => ({ monthlyBudget: data.monthlyBudget }),
}));

vi.mock('@/hooks/useDateLocale', () => ({ useDateLocale: () => undefined }));

import { useAnalyticsData } from '@/hooks/analytics/useAnalyticsData';

// --- Fixtures ---

const NOW = new Date(2026, 7, 15); // 15 Aug 2026

const expense = (date: string, amount: number, categoryId?: string): Expense =>
  ({
    id: `${date}-${amount}`,
    date,
    amount,
    category_id: categoryId ?? null,
    type: 'expense',
    is_excluded: false,
    description: 'x',
  }) as Expense;

const category = (id: string, name: string) => ({
  id,
  name,
  color: '#000',
  icon: null,
});

const render = () => renderHook(() => useAnalyticsData(NOW)).result;

beforeEach(() => {
  plan.isPro = false;
  data.expenses = [];
  data.categories = [];
  data.monthlyBudget = null;
});

describe('free-tier window', () => {
  beforeEach(() => {
    // Aug, Jul, Jun are inside the free 3-month window; May and last year are not.
    data.expenses = [
      expense('2026-08-10', 100),
      expense('2026-07-10', 50),
      expense('2026-06-10', 25),
      expense('2026-05-10', 999),
      expense('2025-11-10', 500),
    ];
  });

  it('clips the analysed population to the last three months', () => {
    const r = render();

    expect(r.current.expenses.map((e) => e.amount).sort((a, b) => a - b)).toEqual(
      [25, 50, 100],
    );
  });

  it('lets Pro see the whole history', () => {
    plan.isPro = true;
    const r = render();

    expect(r.current.expenses).toHaveLength(5);
    expect(r.current.availableYears).toContain(2025);
  });

  it('hides years that fall outside the free window', () => {
    const r = render();

    expect(r.current.availableYears).not.toContain(2025);
  });

  it('still draws the rolling rhythm from the full history', () => {
    // The rhythm shows a shape, not a readable figure — gating the one visual
    // the app is recognisable by would be the wrong side of the Pro line.
    const r = render();

    const may = r.current.rhythmMonths.find((m) => m.fullMonth.includes('May'));
    expect(may?.amount).toBe(999);
  });
});

describe('year selection', () => {
  it('defaults to the newest available year', () => {
    plan.isPro = true;
    data.expenses = [expense('2026-08-10', 10), expense('2024-01-01', 20)];

    expect(render().current.selectedYear).toBe(2026);
  });

  it('always offers the current year even with no expenses in it', () => {
    plan.isPro = true;
    data.expenses = [expense('2024-01-01', 20)];

    expect(render().current.availableYears).toContain(2026);
  });

  it('snaps back to the newest year when the selection disappears', () => {
    plan.isPro = true;
    data.expenses = [expense('2026-08-10', 10), expense('2024-01-01', 20)];
    const r = render();

    act(() => r.current.setSelectedYear(2024));
    expect(r.current.selectedYear).toBe(2024);

    // The 2024 rows fall away (e.g. the free window slid past them).
    act(() => r.current.setSelectedYear(1999));
    expect(r.current.selectedYear).toBe(2026);
  });
});

describe('monthly data', () => {
  it('always returns twelve months, zero-filled', () => {
    plan.isPro = true;
    data.expenses = [expense('2026-03-05', 60)];
    const r = render();

    expect(r.current.monthlyData).toHaveLength(12);
    expect(r.current.monthlyData[2].amount).toBe(60);
    expect(r.current.monthlyData[0].amount).toBe(0);
  });

  it('buckets several expenses into the same month', () => {
    plan.isPro = true;
    data.expenses = [expense('2026-03-05', 60), expense('2026-03-20', 40)];

    expect(render().current.monthlyData[2].amount).toBe(100);
  });
});

describe('month comparison', () => {
  it('reports the delta and percent change against last month', () => {
    data.expenses = [
      expense('2026-08-01', 150),
      expense('2026-07-01', 100),
    ];
    const r = render();

    expect(r.current.monthComparison.thisMonthAmount).toBe(150);
    expect(r.current.monthComparison.lastMonthAmount).toBe(100);
    expect(r.current.monthComparison.delta).toBe(50);
    expect(r.current.monthComparison.percentChange).toBe(50);
  });

  it('leaves percent change null when last month had no spending', () => {
    // Dividing by zero would render as Infinity%.
    data.expenses = [expense('2026-08-01', 150)];

    expect(render().current.monthComparison.percentChange).toBeNull();
  });
});

describe('yearly stats', () => {
  beforeEach(() => {
    plan.isPro = true;
    data.categories = [category('c1', 'Food'), category('c2', 'Rent')];
    data.expenses = [
      expense('2026-01-05', 100, 'c1'),
      expense('2026-02-05', 300, 'c2'),
      expense('2026-03-05', 50, 'c1'),
    ];
  });

  it('ranks the category breakdown by amount, biggest first', () => {
    const r = render();

    expect(r.current.yearlyStats.categoryBreakdown.map((c) => c.name)).toEqual([
      'Rent',
      'Food',
    ]);
    expect(r.current.yearlyStats.categoryBreakdown[1].amount).toBe(150);
  });

  it('drops categories with nothing spent in them', () => {
    data.categories = [...data.categories, category('c3', 'Unused')];

    expect(
      render().current.yearlyStats.categoryBreakdown.map((c) => c.name),
    ).not.toContain('Unused');
  });

  it('spreads a category across its months', () => {
    const food = render().current.yearlyStats.categoryBreakdown.find(
      (c) => c.name === 'Food',
    );

    expect(food?.monthlyAmounts[0]).toBe(100);
    expect(food?.monthlyAmounts[2]).toBe(50);
    expect(food?.monthlyAmounts[11]).toBe(0);
  });

  it('averages over months elapsed, not twelve', () => {
    // 450 spent over Jan–Aug is ~56/month, not 450/12.
    const { totalSpent, monthlyAverage, monthsElapsed } =
      render().current.yearlyStats;

    expect(totalSpent).toBe(450);
    expect(monthsElapsed).toBe(8);
    expect(monthlyAverage).toBeCloseTo(450 / 8, 5);
  });

  it('counts uncategorised spending in the total but not the breakdown', () => {
    data.expenses = [...data.expenses, expense('2026-04-01', 70)];
    const r = render();

    expect(r.current.yearlyStats.totalSpent).toBe(520);
    expect(
      r.current.yearlyStats.categoryBreakdown.reduce((s, c) => s + c.amount, 0),
    ).toBe(450);
  });
});

describe('y-axis headroom', () => {
  it('is undefined without a budget to anchor to', () => {
    plan.isPro = true;
    data.expenses = [expense('2026-03-05', 60)];

    expect(render().current.yAxisMax).toBeUndefined();
  });

  it('leaves room above whichever is taller: the budget or the peak month', () => {
    plan.isPro = true;
    data.monthlyBudget = 1000;
    data.expenses = [expense('2026-03-05', 60)];
    expect(render().current.yAxisMax).toBeCloseTo(1150, 5);

    data.expenses = [expense('2026-03-05', 5000)];
    expect(render().current.yAxisMax).toBeCloseTo(5750, 5);
  });
});
