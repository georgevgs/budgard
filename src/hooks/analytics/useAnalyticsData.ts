import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  useDataConfig,
  useExpensesData,
  useCategoriesData,
} from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { useIsPro } from '@/hooks/useIsPro';
import { getFreeAnalyticsCutoff } from '@/lib/proLimits';
import { monthsElapsedInYear } from '@/lib/utils';

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

export const useAnalyticsData = () => {
  const allExpenses = useExpensesData();
  const { expenseCategories: categories } = useCategoriesData();
  const { monthlyBudget } = useDataConfig();
  const dateLocale = useDateLocale();
  const isPro = useIsPro();

  // Free tier sees the last 3 months only; everything downstream (year list,
  // charts, breakdowns, month comparison) derives from this window.
  const expenses = useMemo(() => {
    if (isPro) return allExpenses;
    const cutoff = getFreeAnalyticsCutoff();

    return allExpenses.filter((e) => parseISO(e.date) >= cutoff);
  }, [allExpenses, isPro]);

  // YYYY-MM-DD dates: slicing the year/month straight off the string is ~10x
  // faster than parseISO per row (see useExpensesFilter for the same pattern).
  const availableYears = useMemo(() => {
    const years = new Set(expenses.map((e) => Number(e.date.slice(0, 4))));
    years.add(new Date().getFullYear());

    return Array.from(years).sort().reverse();
  }, [expenses]);

  const [selectedYear, setSelectedYear] = useState(
    () => availableYears[0] || new Date().getFullYear(),
  );

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

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
    const now = new Date();
    const thisMonthKey = format(now, 'yyyy-MM');
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = format(lastMonthDate, 'yyyy-MM');

    let thisMonthAmount = 0;
    let lastMonthAmount = 0;
    for (const e of expenses) {
      const key = e.date.slice(0, 7);
      if (key === thisMonthKey) {
        thisMonthAmount += e.amount;
      } else if (key === lastMonthKey) {
        lastMonthAmount += e.amount;
      }
    }

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
  }, [expenses, dateLocale]);

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

    const monthsElapsed = monthsElapsedInYear(selectedYear);
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
  }, [yearExpenses, categories, selectedYear]);

  const yAxisMax = useMemo(() => {
    const maxAmount = Math.max(...monthlyData.map((d) => d.amount), 0);
    if (monthlyBudget) {
      return Math.max(monthlyBudget * 1.15, maxAmount * 1.15);
    }

    return undefined;
  }, [monthlyData, monthlyBudget]);

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
  };
};
