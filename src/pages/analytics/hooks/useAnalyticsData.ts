import { useMemo, useState } from 'react';
import { format, parseISO, type Locale } from 'date-fns';
import {
  useDataConfig,
  useExpensesData,
  useCategoriesData,
} from '@/common/contexts/DataContext';
import { useDateLocale } from '@/common/hooks/useDateLocale';
import { onlySpending } from '@/constants/spending';
import { sumAmounts } from '@/constants/money';
import { useSubscription } from '@/common/contexts/SubscriptionContext';
import { useOnDemandHistory } from '@/common/hooks/data/useOnDemandHistory';
import { getFreeAnalyticsCutoff } from '@/constants/proLimits';
import { monthsElapsedInYear } from '@/constants/utils';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

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

  useOnDemandHistory(isPro);

  // Everything that counts as spending, over the full history. The rolling
  // 12-month chart needs this rather than the free-tier window below, which
  // would clip it to three months.
  const countedExpenses = useMemo(
    () => onlySpending(allExpenses),
    [allExpenses],
  );

  // Free tier sees the last 3 months only; everything downstream (year list,
  // charts, breakdowns, month comparison) derives from this window.
  //
  // The exclusion is applied HERE, once, rather than per-memo. It used to be
  // applied in monthlyData only, so the bar chart, the headline sitting above
  // it and the year totals were computed on different populations and
  // contradicted each other on screen.
  const expenses = useMemo(() => {
    if (isPro) {
      return countedExpenses;
    }
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

  const monthlyData = useMemo(
    () => buildMonthlyTotals(yearExpenses, selectedYear, dateLocale),
    [yearExpenses, selectedYear, dateLocale],
  );

  const monthComparison = useMemo<MonthComparison>(
    () => compareMonths(expenses, dateLocale, now),
    [expenses, dateLocale, now],
  );

  const yearlyStats = useMemo(
    () => summariseYear(yearExpenses, categories, selectedYear, now),
    [yearExpenses, categories, selectedYear, now],
  );

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

// The stored date is YYYY-MM-DD, so bucketing on its yyyy-MM prefix costs a
// string slice per row where parseISO would cost a parse. date-fns is left to
// do what only it can: render the twelve labels.
const buildMonthlyTotals = (
  yearExpenses: Expense[],
  year: number,
  dateLocale: Locale,
) => {
  const totals = new Map<string, number>();
  for (const expense of yearExpenses) {
    const key = expense.date.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + expense.amount);
  }

  return Array.from({ length: 12 }, (_, index) => {
    const month = (index + 1).toString().padStart(2, '0');
    const key = `${year}-${month}`;

    return {
      month: format(parseISO(`${key}-01`), 'LLL', { locale: dateLocale }),
      fullMonth: format(parseISO(`${key}-01`), 'LLLL', { locale: dateLocale }),
      amount: totals.get(key) ?? 0,
    };
  });
};

const compareMonths = (
  expenses: Expense[],
  dateLocale: Locale,
  now: Date,
): MonthComparison => {
  const thisMonthKey = format(now, 'yyyy-MM');
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = format(lastMonthDate, 'yyyy-MM');

  const thisMonthRows: number[] = [];
  const lastMonthRows: number[] = [];
  for (const expense of expenses) {
    const key = expense.date.slice(0, 7);
    if (key === thisMonthKey) {
      thisMonthRows.push(expense.amount);
    } else if (key === lastMonthKey) {
      lastMonthRows.push(expense.amount);
    }
  }

  const thisMonthAmount = sumAmounts(thisMonthRows);
  const lastMonthAmount = sumAmounts(lastMonthRows);
  const delta = thisMonthAmount - lastMonthAmount;

  // No previous spending means no percentage to state — not a 100% rise.
  let percentChange: number | null = null;
  if (lastMonthAmount > 0) {
    percentChange = (delta / lastMonthAmount) * 100;
  }

  return {
    thisMonthLabel: format(now, 'LLLL yyyy', { locale: dateLocale }),
    lastMonthLabel: format(lastMonthDate, 'LLLL yyyy', { locale: dateLocale }),
    thisMonthAmount,
    lastMonthAmount,
    delta,
    percentChange,
  };
};

type CategoryBucket = { total: number; monthly: number[] };

// One pass buckets every row by category and by month index. The category list
// is then mapped over those buckets, so a category with nothing spent against
// it drops out rather than rendering a zero row.
const summariseYear = (
  yearExpenses: Expense[],
  categories: Category[],
  year: number,
  now: Date,
) => {
  const byCategory = new Map<string, CategoryBucket>();
  let totalSpent = 0;

  for (const expense of yearExpenses) {
    totalSpent += expense.amount;
    if (!expense.category_id) {
      continue;
    }
    let slot = byCategory.get(expense.category_id);
    if (!slot) {
      slot = { total: 0, monthly: new Array(12).fill(0) };
      byCategory.set(expense.category_id, slot);
    }
    const monthIndex = Number(expense.date.slice(5, 7)) - 1;
    slot.total += expense.amount;
    slot.monthly[monthIndex] += expense.amount;
  }

  const monthsElapsed = monthsElapsedInYear(year, now);
  let monthlyAverage = 0;
  if (monthsElapsed > 0) {
    monthlyAverage = totalSpent / monthsElapsed;
  }

  const categoryBreakdown: CategoryRow[] = categories
    .map((category) => toCategoryRow(category, byCategory.get(category.id)))
    .filter((category) => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return { totalSpent, monthlyAverage, categoryBreakdown, monthsElapsed };
};

const toCategoryRow = (
  category: Category,
  bucket: CategoryBucket | undefined,
): CategoryRow => {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    icon: category.icon,
    amount: bucket?.total ?? 0,
    monthlyAmounts: bucket?.monthly ?? new Array(12).fill(0),
  };
};

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
