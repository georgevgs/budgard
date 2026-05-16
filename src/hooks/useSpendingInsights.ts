import { useMemo } from 'react';
import { format, parseISO, getDaysInMonth } from 'date-fns';
import type { Locale } from 'date-fns';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Gauge from 'lucide-react/dist/esm/icons/gauge';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import { formatCurrency } from '@/lib/utils';
import { buildWeeklyRecap, type WeeklyAnomaly } from '@/lib/weeklyAnomalies';

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

const MIN_DAYS_FOR_TRENDS = 7;

export const useSpendingInsights = (params: SpendingInsightsParams): Insight[] => {
  const { expenses, monthlyBudget, monthComparison, categories, defaultCurrency } = params;
  const { t } = useTranslation();

  return useMemo(() => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = getDaysInMonth(now);
    const recap = buildWeeklyRecap({ now, expenses, categories });
    const topAnomaly = recap?.anomalies[0] ?? null;

    const insights: (Insight | null)[] = [
      weeklyAnomalyInsight({ anomaly: topAnomaly, t }),
      dailyBudgetRemainingInsight({
        monthlyBudget,
        thisMonthAmount: monthComparison.thisMonthAmount,
        dayOfMonth,
        daysInMonth,
        defaultCurrency,
        t,
      }),
      spendingPaceInsight({
        monthlyBudget,
        thisMonthAmount: monthComparison.thisMonthAmount,
        dayOfMonth,
        daysInMonth,
        t,
      }),
      monthProjectionInsight({
        thisMonthAmount: monthComparison.thisMonthAmount,
        dayOfMonth,
        daysInMonth,
        defaultCurrency,
        t,
      }),
    ];

    void parseISO;
    void format;

    return insights.filter((i): i is Insight => i !== null);
  }, [expenses, categories, monthlyBudget, monthComparison, defaultCurrency, t]);
};

// ─── Insight builders ───────────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

type WeeklyAnomalyArgs = {
  anomaly: WeeklyAnomaly | null;
  t: TFunc;
};

const weeklyAnomalyInsight = (args: WeeklyAnomalyArgs): Insight | null => {
  const { anomaly, t } = args;
  if (!anomaly) return null;

  const multiple = anomaly.ratio.toFixed(1).replace(/\.0$/, '');

  if (anomaly.direction === 'up') {
    return {
      id: 'weeklyAnomalyUp',
      icon: TrendingUp,
      text: t('analytics.insights.weeklyAnomalyUp', {
        name: anomaly.categoryName,
        multiple,
      }),
      variant: 'warning',
    };
  }

  return {
    id: 'weeklyAnomalyDown',
    icon: TrendingDown,
    text: t('analytics.insights.weeklyAnomalyDown', {
      name: anomaly.categoryName,
      multiple,
    }),
    variant: 'positive',
  };
};

type DailyArgs = {
  monthlyBudget: number | null;
  thisMonthAmount: number;
  dayOfMonth: number;
  daysInMonth: number;
  defaultCurrency: string;
  t: TFunc;
};

const dailyBudgetRemainingInsight = (args: DailyArgs): Insight | null => {
  const { monthlyBudget, thisMonthAmount, dayOfMonth, daysInMonth, defaultCurrency, t } = args;
  if (monthlyBudget === null || monthlyBudget === 0) return null;

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

type PaceArgs = {
  monthlyBudget: number | null;
  thisMonthAmount: number;
  dayOfMonth: number;
  daysInMonth: number;
  t: TFunc;
};

const spendingPaceInsight = (args: PaceArgs): Insight | null => {
  const { monthlyBudget, thisMonthAmount, dayOfMonth, daysInMonth, t } = args;
  if (monthlyBudget === null || monthlyBudget === 0) return null;
  if (dayOfMonth < MIN_DAYS_FOR_TRENDS) return null;
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

type ProjectionArgs = {
  thisMonthAmount: number;
  dayOfMonth: number;
  daysInMonth: number;
  defaultCurrency: string;
  t: TFunc;
};

const monthProjectionInsight = (args: ProjectionArgs): Insight | null => {
  const { thisMonthAmount, dayOfMonth, daysInMonth, defaultCurrency, t } = args;
  if (thisMonthAmount === 0) return null;
  if (dayOfMonth < MIN_DAYS_FOR_TRENDS) return null;
  if (dayOfMonth >= daysInMonth - 1) return null;

  const dailyRate = thisMonthAmount / dayOfMonth;
  const projected = Math.round(dailyRate * daysInMonth);

  if (projected <= thisMonthAmount * 1.05) return null;

  return {
    id: 'monthProjection',
    icon: TrendingUp,
    text: t('analytics.insights.monthProjection', {
      amount: formatCurrency(projected, defaultCurrency),
    }),
    variant: 'warning',
  };
};
