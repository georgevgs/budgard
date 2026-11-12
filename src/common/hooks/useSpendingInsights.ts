import { useMemo } from 'react';
import { format, getDaysInMonth } from 'date-fns';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Gauge from 'lucide-react/dist/esm/icons/gauge';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import { formatCurrency } from '@/constants/utils';
import {
  buildWeeklyRecap,
  type WeeklyAnomaly,
} from '@/constants/weeklyAnomalies';
import type { TranslateFunction } from '@/constants/translate';
import { sumAmounts } from '@/constants/money';
import {
  buildSavingsCategoryIds,
  countsAsEverydaySpending,
  sumSpending,
} from '@/constants/spending';

export type Insight = {
  id: string;
  icon: LucideIcon;
  text: string;
  variant: 'default' | 'warning' | 'positive';
};

export type SpendingInsightsParams = {
  expenses: Expense[];
  monthlyBudget: number | null;
  safeToSpend: number | null;
  monthComparison: { thisMonthAmount: number; lastMonthAmount: number };
  upcomingThisMonth: number;
  loanCostsThisMonth: number;
  categories: Category[];
  defaultCurrency: string;
};

const MIN_DAYS_FOR_TRENDS = 7;

export const useSpendingInsights = (
  params: SpendingInsightsParams,
): Insight[] => {
  const {
    expenses,
    monthlyBudget,
    safeToSpend,
    monthComparison,
    upcomingThisMonth,
    loanCostsThisMonth,
    categories,
    defaultCurrency,
  } = params;
  const { t } = useTranslation();

  return useMemo(() => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = getDaysInMonth(now);
    const recap = buildWeeklyRecap({ now, expenses, categories });
    const topAnomaly = recap?.anomalies[0] ?? null;
    const pace = buildMonthPace(expenses, categories, now);

    const insights: (Insight | null)[] = [
      weeklyAnomalyInsight({ anomaly: topAnomaly, t }),
      dailyBudgetRemainingInsight({
        safeToSpend,
        dayOfMonth,
        daysInMonth,
        defaultCurrency,
        t,
      }),
      spendingPaceInsight({
        monthlyBudget,
        everydaySpent: pace.everydaySpent,
        fixedCosts:
          pace.recurringSpent + upcomingThisMonth + loanCostsThisMonth,
        dayOfMonth,
        daysInMonth,
        t,
      }),
      monthProjectionInsight({
        thisMonthAmount: monthComparison.thisMonthAmount,
        everydaySpent: pace.everydaySpent,
        upcomingThisMonth,
        dayOfMonth,
        daysInMonth,
        defaultCurrency,
        t,
      }),
    ];

    return insights.filter((i): i is Insight => i !== null);
  }, [
    expenses,
    categories,
    monthlyBudget,
    safeToSpend,
    monthComparison,
    upcomingThisMonth,
    loanCostsThisMonth,
    defaultCurrency,
    t,
  ]);
};

// Pace is everyday spending, the same split Today's status uses. A bill that
// lands on the 1st was planned, it says nothing about how fast the month goes.
const buildMonthPace = (
  expenses: Expense[],
  categories: Category[],
  now: Date,
): { everydaySpent: number; recurringSpent: number } => {
  const monthKey = format(now, 'yyyy-MM');
  const savingsCategoryIds = buildSavingsCategoryIds(categories);
  const monthRows = expenses.filter(
    (expense) => monthKey === expense.date.slice(0, 7),
  );

  return {
    everydaySpent: sumAmounts(
      monthRows
        .filter((expense) =>
          countsAsEverydaySpending(expense, savingsCategoryIds),
        )
        .map((expense) => expense.amount),
    ),
    recurringSpent: sumSpending(
      monthRows.filter(
        (expense) =>
          null !== expense.recurring_expense_id &&
          undefined !== expense.recurring_expense_id,
      ),
    ),
  };
};

// ─── Insight builders ───────────────────────────────────────────────────────

type WeeklyAnomalyArgs = {
  anomaly: WeeklyAnomaly | null;
  t: TranslateFunction;
};

const weeklyAnomalyInsight = (args: WeeklyAnomalyArgs): Insight | null => {
  const { anomaly, t } = args;
  if (!anomaly) {
    return null;
  }

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
  safeToSpend: number | null;
  dayOfMonth: number;
  daysInMonth: number;
  defaultCurrency: string;
  t: TranslateFunction;
};

const dailyBudgetRemainingInsight = (args: DailyArgs): Insight | null => {
  const { safeToSpend, dayOfMonth, daysInMonth, defaultCurrency, t } = args;
  if (null === safeToSpend) {
    return null;
  }

  const daysRemaining = daysInMonth - dayOfMonth + 1;

  if (safeToSpend <= 0) {
    return {
      id: 'dailyBudgetRemaining',
      icon: Wallet,
      text: t('analytics.insights.budgetExceeded', {
        amount: formatCurrency(Math.abs(safeToSpend), defaultCurrency),
      }),
      variant: 'warning',
    };
  }

  const dailyAllowance = safeToSpend / daysRemaining;

  let variant: Insight['variant'] = 'positive';
  if (dailyAllowance < 10) {
    variant = 'warning';
  }

  return {
    id: 'dailyBudgetRemaining',
    icon: Wallet,
    text: t('analytics.insights.dailyBudgetRemaining', {
      amount: formatCurrency(dailyAllowance, defaultCurrency),
      days: daysRemaining,
    }),
    variant,
  };
};

type PaceArgs = {
  monthlyBudget: number | null;
  everydaySpent: number;
  fixedCosts: number;
  dayOfMonth: number;
  daysInMonth: number;
  t: TranslateFunction;
};

// Measured against the everyday budget, what is left once this month's bills
// are set aside. Measured against the whole budget, rent on the 1st read as
// "60% used, 3% through the month" for a fortnight of spending nothing.
const spendingPaceInsight = (args: PaceArgs): Insight | null => {
  const { monthlyBudget, everydaySpent, fixedCosts, dayOfMonth, daysInMonth } =
    args;
  if (null === monthlyBudget) {
    return null;
  }

  const everydayBudget = monthlyBudget - fixedCosts;
  const timeProgress = (dayOfMonth / daysInMonth) * 100;
  const isMeasurable =
    0 < everydayBudget &&
    MIN_DAYS_FOR_TRENDS <= dayOfMonth &&
    0 < everydaySpent;

  if (isMeasurable) {
    return paceInsightOrNull(
      (everydaySpent / everydayBudget) * 100,
      timeProgress,
      args.t,
    );
  } else {
    return null;
  }
};

const paceInsightOrNull = (
  budgetProgress: number,
  timeProgress: number,
  t: TranslateFunction,
): Insight | null => {
  const difference = budgetProgress - timeProgress;
  const percents = {
    budgetPercent: Math.round(budgetProgress),
    timePercent: Math.round(timeProgress),
  };

  if (5 <= difference) {
    return {
      id: 'spendingPace',
      icon: Gauge,
      text: t('analytics.insights.spendingPaceAhead', percents),
      variant: 'warning',
    };
  } else if (difference <= -5) {
    return {
      id: 'spendingPace',
      icon: Gauge,
      text: t('analytics.insights.spendingPaceBehind', percents),
      variant: 'positive',
    };
  } else {
    return null;
  }
};

type ProjectionArgs = {
  thisMonthAmount: number;
  everydaySpent: number;
  upcomingThisMonth: number;
  dayOfMonth: number;
  daysInMonth: number;
  defaultCurrency: string;
  t: TranslateFunction;
};

// Month-end estimate: what is already spent, the bills still due, and everyday
// spending carried on at its own daily rate. Extrapolating the whole total
// multiplied a rent paid once by every remaining day of the month.
const monthProjectionInsight = (args: ProjectionArgs): Insight | null => {
  const { thisMonthAmount, dayOfMonth, daysInMonth, defaultCurrency, t } = args;
  const isProjectable =
    0 !== thisMonthAmount &&
    MIN_DAYS_FOR_TRENDS <= dayOfMonth &&
    dayOfMonth < daysInMonth - 1;
  const projected = projectMonthEnd(args);

  if (isProjectable && thisMonthAmount * 1.05 < projected) {
    return {
      id: 'monthProjection',
      icon: TrendingUp,
      text: t('analytics.insights.monthProjection', {
        amount: formatCurrency(projected, defaultCurrency),
      }),
      variant: 'warning',
    };
  } else {
    return null;
  }
};

export const projectMonthEnd = (args: {
  thisMonthAmount: number;
  everydaySpent: number;
  upcomingThisMonth: number;
  dayOfMonth: number;
  daysInMonth: number;
}): number => {
  const everydayPerDay = Math.max(args.everydaySpent, 0) / args.dayOfMonth;
  const daysLeft = args.daysInMonth - args.dayOfMonth;

  return Math.round(
    args.thisMonthAmount + args.upcomingThisMonth + everydayPerDay * daysLeft,
  );
};
