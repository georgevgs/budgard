import { useMemo, useState } from 'react';
import { format, parseISO, type Locale } from 'date-fns';
import {
  useDataConfig,
  useExpensesData,
  useCategoriesData,
} from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { onlySpending } from '@/lib/spending';
import { sumAmounts } from '@/lib/money';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getFreeAnalyticsCutoff } from '@/lib/proLimits';
import { monthsElapsedInYear } from '@/lib/utils';
import type { Expense } from '@/types/Expense';

export type CategoryRow = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  amount: number;
  monthlyAmounts: number[];
};

export type MonthComparison = {
  thisMonthLabel: string;
  lastMonthLabel: string;
  thisMonthAmount: number;
  lastMonthAmount: number;
  delta: number;
  percentChange: number | null;
};

export const useAnalyticsData = (now: Date = new Date()) => {
  const allExpenses = useExpensesData();
  const { expenseCategories: categories } = useCategoriesData();
  const { monthlyBudget } = useDataConfig();
  const dateLocale = useDateLocale();
  const { isPro } = useSubscription();

  // Free tier sees the last 3 months only; everything downstream (year list,
  // charts, breakdowns, month comparison) derives from this window.
  //
  // The exclusion is applied HERE, once, rather than per-memo. It used to be
  // applied in monthlyData only, so the bar chart, the headline sitting above
  // it and the year totals were computed on different populations and
  // contradicted each other on screen.
  // Everything that counts as spending, over the full history. The rolling
  // 12-month chart needs this rather than the free-tier window below, which
  // would clip it to three months.
  const countedExpenses = useMemo(
    () => onlySpending(allExpenses),
    [allExpenses],
  );

  const expenses = useMemo(() => {
    if (isPro) return countedExpenses;
    const cutoff = getFreeAnalyticsCutoff(now);

    return countedExpenses.filter((e) => parseISO(e.date) >= cutoff);
  }, [countedExpenses, isPro, now]);

  // YYYY-MM-DD dates: slicing the year/month straight off the string is ~10x
  // faster than parseISO per row (see useExpensesFilter for the same pattern).
  const availableYears = useMemo(() => {
    const years = new Set(expenses.map((e) => Number(e.date.slice(0, 4))));
    years.add(now.getFullYear());

    return Array.from(years).sort().reverse();
  }, [expenses, now]);

  const [selectedYear, setSelectedYear] = useState(
    () => availableYears[0] || now.getFullYear(),
  );

  // Clamp during render (guarded): if the selected year disappears (e.g. the
  // free-tier window slid past it), snap to the newest available year.
  if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
    setSelectedYear(availableYears[0]);
  }

  const yearExpenses = useMemo(() => {
    return expenses.filter((e) => Number(e.date.slice(0, 4)) === selectedYear);
  }, [expenses, selectedYear]);

  const monthlyData = useMemo(() => {
    // Single pass: bucket totals by the row's yyyy-MM prefix, then map the
    // 12 month keys to human-readable labels (date-fns only for labels).
    const totals = new Map<string, number>();
    for (const e of yearExpenses) {
      const key = e.date.slice(0, 7);
      totals.set(key, (totals.get(key) ?? 0) + e.amount);
    }

    return Array.from({ length: 12 }, (_, i) => {
      const month = (i + 1).toString().padStart(2, '0');
      const key = `${selectedYear}-${month}`;

      return {
        month: format(parseISO(`${key}-01`), 'LLL', { locale: dateLocale }),
        fullMonth: format(parseISO(`${key}-01`), 'LLLL', {
          locale: dateLocale,
        }),
        amount: totals.get(key) ?? 0,
      };
    });
  }, [yearExpenses, selectedYear, dateLocale]);

  const monthComparison = useMemo<MonthComparison>(() => {
    const thisMonthKey = format(now, 'yyyy-MM');
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = format(lastMonthDate, 'yyyy-MM');

    const thisMonthRows: number[] = [];
    const lastMonthRows: number[] = [];
    for (const e of expenses) {
      const key = e.date.slice(0, 7);
      if (key === thisMonthKey) {
        thisMonthRows.push(e.amount);
      } else if (key === lastMonthKey) {
        lastMonthRows.push(e.amount);
      }
    }
    const thisMonthAmount = sumAmounts(thisMonthRows);
    const lastMonthAmount = sumAmounts(lastMonthRows);

    const delta = thisMonthAmount - lastMonthAmount;
    let percentChange: number | null = null;
    if (lastMonthAmount > 0) {
      percentChange = (delta / lastMonthAmount) * 100;
    }

    return {
      thisMonthLabel: format(now, 'LLLL yyyy', { locale: dateLocale }),
      lastMonthLabel: format(lastMonthDate, 'LLLL yyyy', {
        locale: dateLocale,
      }),
      thisMonthAmount,
      lastMonthAmount,
      delta,
      percentChange,
    };
  }, [expenses, dateLocale, now]);

  const yearlyStats = useMemo(() => {
    // Single pass: bucket each expense by category and by month index.
    type Bucket = { total: number; monthly: number[] };
    const byCat = new Map<string, Bucket>();
    let totalSpent = 0;

    for (const e of yearExpenses) {
      totalSpent += e.amount;
      if (!e.category_id) continue;
      let slot = byCat.get(e.category_id);
      if (!slot) {
        slot = { total: 0, monthly: new Array(12).fill(0) };
        byCat.set(e.category_id, slot);
      }
      const monthIdx = Number(e.date.slice(5, 7)) - 1;
      slot.total += e.amount;
      slot.monthly[monthIdx] += e.amount;
    }

    const monthsElapsed = monthsElapsedInYear(selectedYear, now);
    let monthlyAverage = 0;
    if (monthsElapsed > 0) {
      monthlyAverage = totalSpent / monthsElapsed;
    }

    const categoryBreakdown: CategoryRow[] = categories
      .map((cat) => {
        const slot = byCat.get(cat.id);

        return {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          amount: slot?.total ?? 0,
          monthlyAmounts: slot?.monthly ?? new Array(12).fill(0),
        };
      })
      .filter((cat) => cat.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return {
      totalSpent,
      monthlyAverage,
      categoryBreakdown,
      monthsElapsed,
    };
  }, [yearExpenses, categories, selectedYear, now]);

  const yAxisMax = useMemo(() => {
    const maxAmount = Math.max(...monthlyData.map((d) => d.amount), 0);
    if (monthlyBudget) {
      return Math.max(monthlyBudget * 1.15, maxAmount * 1.15);
    }

    return undefined;
  }, [monthlyData, monthlyBudget]);

  // Deliberately built from ALL expenses, not the free-tier window.
  //
  // The Pro gate protects the detailed history — the year picker, the
  // breakdowns, the drill-downs. The rhythm shows a shape rather than a
  // history: you cannot read a figure off it or click into a month. Gating the
  // one visual the app is recognisable by, so that the people most likely to
  // be persuaded by it are the only ones who never see it, is the wrong side
  // of that line.
  //
  // Rolling twelve months rather than the selected calendar year, because a
  // rhythm is about the recent shape of your spending and a year viewed in
  // March is nine-twelfths empty.
  const rhythmMonths = useMemo(
    () => buildRollingMonths(countedExpenses, dateLocale, now),
    [countedExpenses, dateLocale, now],
  );

  return {
    selectedYear,
    setSelectedYear,
    availableYears,
    expenses,
    yearExpenses,
    monthlyData,
    monthComparison,
    yearlyStats,
    yAxisMax,
    rhythmMonths,
  };
};

// --- Helpers ---

const ROLLING_MONTHS = 12;

// Callers pass the already-filtered `expenses` population, so this no longer
// re-applies the exclusion.
const buildRollingMonths = (
  expenses: Expense[],
  dateLocale: Locale,
  now: Date,
) => {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    const key = expense.date.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + expense.amount);
  }

  return Array.from({ length: ROLLING_MONTHS }, (_, offset) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - (ROLLING_MONTHS - 1 - offset),
      1,
    );
    const key = format(date, 'yyyy-MM');

    return {
      month: format(date, 'LLL', { locale: dateLocale }),
      fullMonth: format(date, 'LLLL yyyy', { locale: dateLocale }),
      amount: totals.get(key) ?? 0,
    };
  });
};
