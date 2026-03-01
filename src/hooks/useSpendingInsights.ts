import { useMemo } from 'react';
import {
  format,
  parseISO,
  getDaysInMonth,
  getDay,
  setDay,
} from 'date-fns';
import type { Locale } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  CalendarDays,
  ShieldCheck,
  AlertCircle,
  Receipt,
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
  monthlyData: { amount: number }[];
  categories: Category[];
  dateLocale: Locale;
}

export function useSpendingInsights(params: SpendingInsightsParams): Insight[] {
  const { expenses, monthlyBudget, monthComparison, monthlyData, categories, dateLocale } = params;
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
        icon: projected > monthComparison.thisMonthAmount ? TrendingUp : TrendingDown,
        text: t('analytics.insights.monthProjection', { amount: formattedAmount }),
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
      const counts = new Array<number>(7).fill(0);

      for (const e of expenses) {
        const dow = getDay(parseISO(e.date));
        totals[dow] += e.amount;
        counts[dow]++;
      }

      const averages = totals.map((total, i) =>
        counts[i] > 0 ? total / counts[i] : 0,
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

      const currentMonthIndex = now.getMonth(); // 0-based
      let streak = 0;

      for (let i = currentMonthIndex - 1; i >= 0; i--) {
        const monthData = monthlyData[i];
        if (!monthData || monthData.amount <= 0 || monthData.amount >= monthlyBudget) break;
        streak++;
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

    insights.push(
      monthProjectionInsight(),
      categoryComparisonInsight(),
      peakDayInsight(),
      budgetStreakInsight(),
      inactivityInsight(),
      largestExpenseInsight(),
    );

    return insights.filter((i): i is Insight => i !== null);
  }, [expenses, monthlyBudget, monthComparison, monthlyData, categories, dateLocale, t]);
}
