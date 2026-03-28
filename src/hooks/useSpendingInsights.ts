import { useMemo } from 'react';
import { format, parseISO, getDaysInMonth, getDay, setDay } from 'date-fns';
import type { Locale } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  CalendarDays,
  ShieldCheck,
  AlertCircle,
  Receipt,
  PieChart,
  Activity,
  Flame,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

export interface Insight {
  id: string;
  icon: LucideIcon;
  text: string;
  variant: 'default' | 'warning' | 'positive';
}

export interface SpendingInsightsParams {
  expenses: Expense[];
  monthlyBudget: number | null;
  monthComparison: { thisMonthAmount: number; lastMonthAmount: number };
  categories: Category[];
  dateLocale: Locale;
}

export function useSpendingInsights(params: SpendingInsightsParams): Insight[] {
  const { expenses, monthlyBudget, monthComparison, categories, dateLocale } =
    params;
  const { t } = useTranslation();

  return useMemo(() => {
    const now = new Date();
    const thisMonthKey = format(now, 'yyyy-MM');
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = format(lastMonthDate, 'yyyy-MM');

    const insights: (Insight | null)[] = [];

    // 1. Month Projection
    const monthProjectionInsight = (): Insight | null => {
      const { thisMonthAmount } = monthComparison;
      if (thisMonthAmount === 0) return null;

      const dayOfMonth = now.getDate();
      const daysInMonth = getDaysInMonth(now);

      if (dayOfMonth >= daysInMonth - 1) return null;

      const dailyRate = thisMonthAmount / dayOfMonth;
      const projected = dailyRate * daysInMonth;

      if (projected <= thisMonthAmount * 1.05) return null;

      const formattedAmount = `${projected.toFixed(2)} €`;
      return {
        id: 'monthProjection',
        icon: TrendingUp,
        text: t('analytics.insights.monthProjection', {
          amount: formattedAmount,
        }),
        variant: 'warning',
      };
    };

    // 2. Biggest Category vs Last Month
    const categoryComparisonInsight = (): Insight | null => {
      const thisMonthExpenses = expenses.filter(
        (e) => format(parseISO(e.date), 'yyyy-MM') === thisMonthKey,
      );
      const lastMonthExpenses = expenses.filter(
        (e) => format(parseISO(e.date), 'yyyy-MM') === lastMonthKey,
      );

      if (thisMonthExpenses.length === 0) return null;

      const thisMonthByCategory = new Map<string, number>();
      for (const e of thisMonthExpenses) {
        if (!e.category_id) continue;
        thisMonthByCategory.set(
          e.category_id,
          (thisMonthByCategory.get(e.category_id) ?? 0) + e.amount,
        );
      }

      if (thisMonthByCategory.size === 0) return null;

      let topCategoryId = '';
      let topAmount = 0;
      for (const [catId, amount] of thisMonthByCategory.entries()) {
        if (amount > topAmount) {
          topAmount = amount;
          topCategoryId = catId;
        }
      }

      const lastAmount = lastMonthExpenses
        .filter((e) => e.category_id === topCategoryId)
        .reduce((sum, e) => sum + e.amount, 0);

      if (lastAmount === 0) return null;

      const pct = ((topAmount - lastAmount) / lastAmount) * 100;
      if (Math.abs(pct) < 5) return null;

      const category = categories.find((c) => c.id === topCategoryId);
      if (!category) return null;

      const percent = Math.abs(Math.round(pct)).toString();
      const name = category.name;

      if (pct > 0) {
        return {
          id: 'categoryUp',
          icon: TrendingUp,
          text: t('analytics.insights.categoryUp', { name, percent }),
          variant: 'warning',
        };
      }

      return {
        id: 'categoryDown',
        icon: TrendingDown,
        text: t('analytics.insights.categoryDown', { name, percent }),
        variant: 'positive',
      };
    };

    // 3. Peak Day of Week
    const peakDayInsight = (): Insight | null => {
      if (expenses.length < 14) return null;

      const totals = new Array<number>(7).fill(0);
      const uniqueDates = Array.from({ length: 7 }, () => new Set<string>());

      for (const e of expenses) {
        const parsed = parseISO(e.date);
        const dow = getDay(parsed);
        totals[dow] += e.amount;
        uniqueDates[dow].add(e.date);
      }

      const averages = totals.map((total, i) =>
        uniqueDates[i].size > 0 ? total / uniqueDates[i].size : 0,
      );

      let peakDow = 0;
      let peakAvg = 0;
      for (let i = 0; i < 7; i++) {
        if (averages[i] > peakAvg) {
          peakAvg = averages[i];
          peakDow = i;
        }
      }

      const referenceDate = setDay(new Date(), peakDow);
      const day = format(referenceDate, 'EEEE', { locale: dateLocale });

      return {
        id: 'peakDay',
        icon: CalendarDays,
        text: t('analytics.insights.peakDay', { day }),
        variant: 'default',
      };
    };

    // 4. Budget Streak
    const budgetStreakInsight = (): Insight | null => {
      if (monthlyBudget === null) return null;

      const currentYear = now.getFullYear();
      let streak = 0;

      const getMonthTotal = (year: number, month: number): number => {
        const key = `${year}-${(month + 1).toString().padStart(2, '0')}`;

        return expenses
          .filter((e) => format(parseISO(e.date), 'yyyy-MM') === key)
          .reduce((sum, e) => sum + e.amount, 0);
      };

      let year = currentYear;
      let month = now.getMonth() - 1;

      while (true) {
        if (month < 0) {
          month = 11;
          year--;
        }

        const total = getMonthTotal(year, month);
        if (total >= monthlyBudget) break;
        if (total === 0) break;

        streak++;
        month--;
      }

      if (streak < 2) return null;

      return {
        id: 'budgetStreak',
        icon: ShieldCheck,
        text: t('analytics.insights.budgetStreak', { count: streak }),
        variant: 'positive',
      };
    };

    // 5. Inactivity Nudge
    const inactivityInsight = (): Insight | null => {
      if (expenses.length === 0) return null;

      const sorted = [...expenses].sort(
        (a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime(),
      );
      const latest = sorted[0];

      const daysDiff = Math.floor(
        (Date.now() - parseISO(latest.date).getTime()) / 86400000,
      );

      if (daysDiff <= 3 || daysDiff > 60) return null;

      return {
        id: 'inactive',
        icon: AlertCircle,
        text: t('analytics.insights.inactive', { days: daysDiff }),
        variant: 'warning',
      };
    };

    // 6. Largest Single Expense This Month
    const largestExpenseInsight = (): Insight | null => {
      const thisMonthExpenses = expenses.filter(
        (e) => format(parseISO(e.date), 'yyyy-MM') === thisMonthKey,
      );

      if (thisMonthExpenses.length === 0) return null;

      const largest = thisMonthExpenses.reduce((prev, curr) =>
        curr.amount > prev.amount ? curr : prev,
      );

      const formattedAmount = `${largest.amount.toFixed(2)} €`;
      const category = largest.category_id
        ? categories.find((c) => c.id === largest.category_id)
        : null;

      if (category) {
        return {
          id: 'largestExpense',
          icon: Receipt,
          text: t('analytics.insights.largestExpense', {
            amount: formattedAmount,
            category: category.name,
          }),
          variant: 'default',
        };
      }

      return {
        id: 'largestExpenseNoCategory',
        icon: Receipt,
        text: t('analytics.insights.largestExpenseNoCategory', {
          amount: formattedAmount,
        }),
        variant: 'default',
      };
    };

    // 7. Weekend vs Weekday spending
    const weekendSpendingInsight = (): Insight | null => {
      const thisMonthExpenses = expenses.filter(
        (e) => format(parseISO(e.date), 'yyyy-MM') === thisMonthKey,
      );

      if (thisMonthExpenses.length < 5) return null;

      let weekendTotal = 0;
      let weekdayTotal = 0;
      let weekendCount = 0;
      let weekdayCount = 0;

      for (const e of thisMonthExpenses) {
        const dow = getDay(parseISO(e.date));
        if (dow === 0 || dow === 6) {
          weekendTotal += e.amount;
          weekendCount++;
        } else {
          weekdayTotal += e.amount;
          weekdayCount++;
        }
      }

      if (weekendCount === 0 || weekdayCount === 0) return null;

      const weekendAvg = weekendTotal / weekendCount;
      const weekdayAvg = weekdayTotal / weekdayCount;
      const ratio = weekendAvg / weekdayAvg;

      if (ratio > 1.5) {
        return {
          id: 'weekendSpending',
          icon: CalendarDays,
          text: t('analytics.insights.weekendHigher', {
            percent: Math.round((ratio - 1) * 100),
          }),
          variant: 'warning',
        };
      }

      if (ratio < 0.5) {
        return {
          id: 'weekendSpending',
          icon: CalendarDays,
          text: t('analytics.insights.weekdayHigher', {
            percent: Math.round((1 - ratio) * 100),
          }),
          variant: 'default',
        };
      }

      return null;
    };

    // 8. Category concentration
    const categoryConcentrationInsight = (): Insight | null => {
      const thisMonthExpenses = expenses.filter(
        (e) => format(parseISO(e.date), 'yyyy-MM') === thisMonthKey,
      );

      if (thisMonthExpenses.length < 3) return null;

      const byCategory = new Map<string, number>();
      let total = 0;
      for (const e of thisMonthExpenses) {
        const key = e.category_id ?? 'uncategorized';
        byCategory.set(key, (byCategory.get(key) ?? 0) + e.amount);
        total += e.amount;
      }

      if (total === 0 || byCategory.size < 2) return null;

      let topCategoryId = '';
      let topAmount = 0;
      for (const [catId, amount] of byCategory.entries()) {
        if (amount > topAmount) {
          topAmount = amount;
          topCategoryId = catId;
        }
      }

      const concentration = (topAmount / total) * 100;

      if (concentration >= 60) {
        const category = categories.find((c) => c.id === topCategoryId);
        const name = category?.name ?? t('analytics.drillDown.uncategorized');

        return {
          id: 'categoryConcentration',
          icon: PieChart,
          text: t('analytics.insights.categoryConcentration', {
            percent: Math.round(concentration),
            name,
          }),
          variant: 'default',
        };
      }

      return null;
    };

    // 9. Month-over-month volatility
    const spendingVolatilityInsight = (): Insight | null => {
      const monthTotals: number[] = [];

      for (let i = 0; i < 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
        const key = format(date, 'yyyy-MM');
        const total = expenses
          .filter((e) => format(parseISO(e.date), 'yyyy-MM') === key)
          .reduce((sum, e) => sum + e.amount, 0);
        if (total > 0) {
          monthTotals.push(total);
        }
      }

      if (monthTotals.length < 3) return null;

      const mean = monthTotals.reduce((s, v) => s + v, 0) / monthTotals.length;
      const variance =
        monthTotals.reduce((s, v) => s + (v - mean) ** 2, 0) /
        monthTotals.length;
      const stdDev = Math.sqrt(variance);
      const coeffOfVariation = (stdDev / mean) * 100;

      if (coeffOfVariation >= 40) {
        return {
          id: 'spendingVolatility',
          icon: Activity,
          text: t('analytics.insights.highVolatility'),
          variant: 'warning',
        };
      }

      if (coeffOfVariation <= 15) {
        return {
          id: 'spendingStable',
          icon: Activity,
          text: t('analytics.insights.stableSpending'),
          variant: 'positive',
        };
      }

      return null;
    };

    // 10. Logging streak — consecutive days with expenses
    const loggingStreakInsight = (): Insight | null => {
      if (expenses.length === 0) return null;

      const expenseDates = new Set(
        expenses.map((e) => format(parseISO(e.date), 'yyyy-MM-dd')),
      );

      let streak = 0;
      const today = new Date();

      // Check if today has an expense; if not, start from yesterday
      const todayKey = format(today, 'yyyy-MM-dd');
      const startOffset = expenseDates.has(todayKey) ? 0 : 1;

      for (let i = startOffset; ; i++) {
        const date = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - i,
        );
        const key = format(date, 'yyyy-MM-dd');
        if (!expenseDates.has(key)) break;
        streak++;
      }

      if (streak < 3) return null;

      return {
        id: 'loggingStreak',
        icon: Flame,
        text: t('analytics.insights.loggingStreak', { count: streak }),
        variant: 'positive',
      };
    };

    insights.push(
      monthProjectionInsight(),
      categoryComparisonInsight(),
      peakDayInsight(),
      budgetStreakInsight(),
      loggingStreakInsight(),
      inactivityInsight(),
      largestExpenseInsight(),
      weekendSpendingInsight(),
      categoryConcentrationInsight(),
      spendingVolatilityInsight(),
    );

    return insights.filter((i): i is Insight => i !== null);
  }, [expenses, monthlyBudget, monthComparison, categories, dateLocale, t]);
}
