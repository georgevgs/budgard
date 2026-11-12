import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { format, subDays } from 'date-fns';
import { useSpendingInsights } from '@/common/hooks/useSpendingInsights';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

// The shared mock returns the bare key, the figures only show up when the
// params ride along.
vi.mock('react-i18next', () => {
  const t = (...parts: unknown[]) => JSON.stringify(parts);

  return { useTranslation: () => ({ t }) };
});

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
        safeToSpend: null,
        monthComparison: { thisMonthAmount: 0, lastMonthAmount: 0 },
        upcomingThisMonth: 0,
        loanCostsThisMonth: 0,
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
      safeToSpend: 340,
      monthComparison: { thisMonthAmount: 100, lastMonthAmount: 0 },
    });
    const insight = result.current.find((i) => i.id === 'dailyBudgetRemaining');
    expect(insight).toBeDefined();
    expect(insight!.variant).toBe('positive');
  });

  it('quotes the same allowance as the Today slab, counting today', () => {
    // 15 March leaves 17 days with today, 340 / 17 = 20 a day.
    const { result } = render({ monthlyBudget: 500, safeToSpend: 340 });
    const texts = result.current
      .filter((insight) => 'dailyBudgetRemaining' === insight.id)
      .map((insight) => insight.text);
    expect(texts[0]).toContain('20,00');
    expect(texts[0]).toContain('"days":17');
  });

  it('flags budget exceeded when spending overshoots the cap', () => {
    const { result } = render({
      expenses: [makeExpense('2026-03-01', 600)],
      monthlyBudget: 500,
      safeToSpend: -100,
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

  // Rent is 60% of the budget and lands on the 1st. Held against the whole
  // budget that read as "ahead of pace" all month with nothing else spent.
  it('does not read a recurring bill as running ahead of pace', () => {
    const rent = {
      ...makeExpense('2026-03-01', 600),
      recurring_expense_id: 'r-rent',
    };
    const { result } = render({
      expenses: [rent, makeExpense('2026-03-10', 150)],
      monthlyBudget: 1000,
      monthComparison: { thisMonthAmount: 750, lastMonthAmount: 0 },
    });

    // 150 of the 400 everyday budget is 38%, against 48% of the month.
    const insight = result.current.find((entry) => 'spendingPace' === entry.id);
    expect(insight).toMatchObject({
      variant: 'positive',
      text: expect.stringContaining('"budgetPercent":38'),
    });
  });

  // --- Month Projection ---

  // Day 15 of 31: 600 rent paid, 150 everyday, 80 still due. Everyday carries
  // on at 10 a day for 16 days: 750 + 80 + 160. Extrapolating the whole total
  // gave 1,550, as if rent were paid again every fortnight.
  it('projects month-end from everyday pace plus the bills still due', () => {
    const rent = {
      ...makeExpense('2026-03-01', 600),
      recurring_expense_id: 'r-rent',
    };
    const { result } = render({
      expenses: [rent, makeExpense('2026-03-10', 150)],
      monthComparison: { thisMonthAmount: 750, lastMonthAmount: 0 },
      upcomingThisMonth: 80,
    });

    const insight = result.current.find(
      (entry) => 'monthProjection' === entry.id,
    );
    expect(insight).toMatchObject({
      text: expect.stringContaining('990,00'),
    });
  });

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
    // Monday so the recap looks back at the just-completed Mon–Sun window.
    // The anomaly expense lands on the prior Sunday inside that window.
    const today = new Date('2026-03-16');
    vi.setSystemTime(today);
    const inWindow = subDays(today, 1);
    const expenses: Expense[] = [
      ...baselineRun('cat-1', 30, 12, today),
      makeExpense(format(inWindow, 'yyyy-MM-dd'), 80),
    ];

    const { result } = render({ expenses });
    const anomaly = result.current.find((i) => i.id === 'weeklyAnomalyUp');
    expect(anomaly).toBeDefined();
    expect(anomaly!.variant).toBe('warning');
  });
});
