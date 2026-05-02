import { useMemo } from 'react';
import { format, parseISO, getDaysInMonth, getDay } from 'date-fns';
import type { Locale } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  CalendarDays,
  ShieldCheck,
  PieChart,
  Activity,
  Wallet,
  Gauge,
  Repeat,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import { formatCurrency } from '@/lib/utils';

export type Insight = {
  id: string;
  icon: LucideIcon;
  text: string;
  variant: 'default' | 'warning' | 'positive';
}

export type SpendingInsightsParams = {
  expenses: Expense[];
  monthlyBudget: number | null;
  monthComparison: { thisMonthAmount: number; lastMonthAmount: number };
  categories: Category[];
  dateLocale: Locale;
  defaultCurrency: string;
}

export const useSpendingInsights = (params: SpendingInsightsParams): Insight[] => {
  const { expenses, monthlyBudget, monthComparison, categories, dateLocale, defaultCurrency } =
    params;
  const { t } = useTranslation();

  return useMemo(() => {
    const now = new Date();
    const thisMonthKey = format(now, 'yyyy-MM');
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = format(lastMonthDate, 'yyyy-MM');

    const insights: (Insight | null)[] = [];
    const dayOfMonth = now.getDate();
    const daysInMonth = getDaysInMonth(now);
    const MIN_DAYS_FOR_TRENDS = 7;

    // 1. Month Projection
    const monthProjectionInsight = (): Insight | null => {
      const { thisMonthAmount } = monthComparison;
      if (thisMonthAmount === 0) return null;

      if (dayOfMonth < MIN_DAYS_FOR_TRENDS) return null;
      if (dayOfMonth >= daysInMonth - 1) return null;

      const dailyRate = thisMonthAmount / dayOfMonth;
      const projected = Math.round(dailyRate * daysInMonth);

      if (projected <= thisMonthAmount * 1.05) return null;

      const formattedAmount = formatCurrency(projected, defaultCurrency);
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

    // 3. Daily Budget Remaining
    const dailyBudgetRemainingInsight = (): Insight | null => {
      if (monthlyBudget === null || monthlyBudget === 0) return null;

      const { thisMonthAmount } = monthComparison;
      const daysRemaining = daysInMonth - dayOfMonth;

      if (daysRemaining <= 0) return null;

      const remaining = monthlyBudget - thisMonthAmount;

      if (remaining <= 0) {
        return {
          id: 'dailyBudgetRemaining',
          icon: Wallet,
          text: t('analytics.insights.budgetExceeded', {
            amount: formatCurrency(Math.abs(remaining), defaultCurrency),
          }),
          variant: 'warning',
        };
      }

      const dailyAllowance = remaining / daysRemaining;

      return {
        id: 'dailyBudgetRemaining',
        icon: Wallet,
        text: t('analytics.insights.dailyBudgetRemaining', {
          amount: formatCurrency(dailyAllowance, defaultCurrency),
          days: daysRemaining,
        }),
        variant: dailyAllowance < 10 ? 'warning' : 'positive',
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
      const minYear = currentYear - 5;

      while (year >= minYear) {
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

    // 5. Spending Pace (budget progress vs time progress)
    const spendingPaceInsight = (): Insight | null => {
      if (monthlyBudget === null || monthlyBudget === 0) return null;
      if (dayOfMonth < MIN_DAYS_FOR_TRENDS) return null;

      const { thisMonthAmount } = monthComparison;
      if (thisMonthAmount === 0) return null;

      const timeProgress = (dayOfMonth / daysInMonth) * 100;
      const budgetProgress = (thisMonthAmount / monthlyBudget) * 100;
      const difference = budgetProgress - timeProgress;

      if (Math.abs(difference) < 5) return null;

      if (difference > 0) {
        return {
          id: 'spendingPace',
          icon: Gauge,
          text: t('analytics.insights.spendingPaceAhead', {
            budgetPercent: Math.round(budgetProgress),
            timePercent: Math.round(timeProgress),
          }),
          variant: 'warning',
        };
      }

      return {
        id: 'spendingPace',
        icon: Gauge,
        text: t('analytics.insights.spendingPaceBehind', {
          budgetPercent: Math.round(budgetProgress),
          timePercent: Math.round(timeProgress),
        }),
        variant: 'positive',
      };
    };

    // 6. Recurring Expenses Share
    const recurringShareInsight = (): Insight | null => {
      const thisMonthExpenses = expenses.filter(
        (e) => format(parseISO(e.date), 'yyyy-MM') === thisMonthKey,
      );

      if (thisMonthExpenses.length < 3) return null;

      const totalAmount = thisMonthExpenses.reduce(
        (sum, e) => sum + e.amount,
        0,
      );
      if (totalAmount === 0) return null;

      const recurringAmount = thisMonthExpenses
        .filter((e) => e.recurring_expense_id !== null && e.recurring_expense_id !== undefined)
        .reduce((sum, e) => sum + e.amount, 0);

      const recurringPercent = (recurringAmount / totalAmount) * 100;

      if (recurringPercent < 10) return null;

      return {
        id: 'recurringShare',
        icon: Repeat,
        text: t('analytics.insights.recurringShare', {
          percent: Math.round(recurringPercent),
        }),
        variant: recurringPercent > 70 ? 'warning' : 'default',
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

    // 9. Largest expense this month
    const largestExpenseInsight = (): Insight | null => {
      const thisMonthExpenses = expenses.filter(
        (e) => format(parseISO(e.date), 'yyyy-MM') === thisMonthKey,
      );
      if (thisMonthExpenses.length === 0) return null;

      const largest = thisMonthExpenses.reduce((max, e) =>
        e.amount > max.amount ? e : max,
      );

      return {
        id: 'largestExpense',
        icon: TrendingUp,
        text: t('analytics.insights.largestExpense', {
          amount: formatCurrency(largest.amount, defaultCurrency),
          description: largest.description,
        }),
        variant: 'default',
      };
    };

    // 10. Inactivity warning
    const ONE_DAY_MS = 1000 * 60 * 60 * 24;

    const inactivityInsight = (): Insight | null => {
      if (expenses.length === 0) return null;

      const lastDate = expenses
        .map((e) => parseISO(e.date))
        .reduce((latest, d) => (d > latest ? d : latest));

      const daysSince = Math.floor(
        (now.getTime() - lastDate.getTime()) / ONE_DAY_MS,
      );

      if (daysSince <= 3) return null;

      return {
        id: 'inactive',
        icon: CalendarDays,
        text: t('analytics.insights.inactive', { days: daysSince }),
        variant: 'warning',
      };
    };

    // 11. Peak spending day of week
    const peakDayInsight = (): Insight | null => {
      const thisMonthExpenses = expenses.filter(
        (e) => format(parseISO(e.date), 'yyyy-MM') === thisMonthKey,
      );

      if (thisMonthExpenses.length < 5) return null;

      const byDow = new Map<number, { total: number; count: number }>();
      for (const e of thisMonthExpenses) {
        const dow = getDay(parseISO(e.date));
        const current = byDow.get(dow) ?? { total: 0, count: 0 };
        byDow.set(dow, { total: current.total + e.amount, count: current.count + 1 });
      }

      if (byDow.size < 2) return null;

      let peakDow = 0;
      let peakAvg = 0;
      for (const [dow, { total, count }] of byDow.entries()) {
        const avg = total / count;
        if (avg > peakAvg) {
          peakAvg = avg;
          peakDow = dow;
        }
      }

      // Jan 1, 2023 was a Sunday (dow 0) — use as reference to get day names
      const REFERENCE_SUNDAY = new Date(2023, 0, 1);
      const dayDate = new Date(REFERENCE_SUNDAY.getTime() + peakDow * ONE_DAY_MS);
      const dayName = format(dayDate, 'EEEE', { locale: dateLocale });

      return {
        id: 'peakDay',
        icon: CalendarDays,
        text: t('analytics.insights.peakDay', { day: dayName }),
        variant: 'default',
      };
    };

    // 12. Logging streak (3+ consecutive days ending today or yesterday)
    const loggingStreakInsight = (): Insight | null => {
      if (expenses.length === 0) return null;

      const uniqueDates = [...new Set(expenses.map((e) => e.date))].sort(
        (a, b) => b.localeCompare(a),
      );

      if (uniqueDates.length < 3) return null;

      const today = format(now, 'yyyy-MM-dd');
      const yesterday = format(
        new Date(now.getTime() - ONE_DAY_MS),
        'yyyy-MM-dd',
      );

      const startDate = uniqueDates[0];
      if (startDate !== today && startDate !== yesterday) return null;

      let streak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = parseISO(uniqueDates[i - 1]);
        const currDate = parseISO(uniqueDates[i]);
        const diff = Math.round(
          (prevDate.getTime() - currDate.getTime()) / ONE_DAY_MS,
        );
        if (diff === 1) {
          streak++;
        } else {
          break;
        }
      }

      if (streak < 3) return null;

      return {
        id: 'loggingStreak',
        icon: CalendarDays,
        text: t('analytics.insights.loggingStreak', { count: streak }),
        variant: 'positive',
      };
    };

    // 13. Month-over-month volatility
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

    insights.push(
      dailyBudgetRemainingInsight(),
      spendingPaceInsight(),
      monthProjectionInsight(),
      categoryComparisonInsight(),
      budgetStreakInsight(),
      recurringShareInsight(),
      weekendSpendingInsight(),
      categoryConcentrationInsight(),
      spendingVolatilityInsight(),
      largestExpenseInsight(),
      inactivityInsight(),
      peakDayInsight(),
      loggingStreakInsight(),
    );

    return insights.filter((i): i is Insight => i !== null);
  }, [expenses, monthlyBudget, monthComparison, categories, dateLocale, defaultCurrency, t]);
};
