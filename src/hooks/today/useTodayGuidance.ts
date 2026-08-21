import { useMemo } from 'react';
import { format, getDaysInMonth } from 'date-fns';
import {
  useCategoriesData,
  useDataConfig,
  useIncomesData,
  useRecurringData,
} from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { useSpendingInsights } from '@/hooks/useSpendingInsights';
import {
  computeSafeToSpend,
  computeUpcomingRecurringThisMonth,
} from '@/lib/forecast';
import { buildUpcomingBills } from '@/lib/upcomingBills';
import type { Expense } from '@/types/Expense';
import { countsAsSpending, sumSpending } from '@/lib/spending';

export type TodayStatus = 'comfortable' | 'watchful' | 'tight' | 'noBudget';

export type MoneyPathPoint = {
  day: number;
  budgetPercent: number;
};

export type RecentActivityItem = {
  transaction: Expense;
  kind: 'expense' | 'income';
};

export const useTodayGuidance = (expenses: Expense[]) => {
  const incomes = useIncomesData();
  const { expenseCategories } = useCategoriesData();
  const { recurringExpenses } = useRecurringData();
  const { monthlyBudget, defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();
  const now = useMemo(() => new Date(), []);
  const monthKey = format(now, 'yyyy-MM');
  const previousMonthKey = format(
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
    'yyyy-MM',
  );

  const model = useMemo(() => {
    const monthExpenses = expenses.filter(
      (expense) => expense.date.slice(0, 7) === monthKey,
    );
    const spentThisMonth = sumTransactions(monthExpenses);
    const spentLastMonth = sumTransactions(
      expenses.filter(
        (expense) => expense.date.slice(0, 7) === previousMonthKey,
      ),
    );
    // Same-day-of-month cut. Comparing a part-month against a whole one would
    // tell every user on the 5th that they are doing brilliantly.
    const spentLastMonthToDate = sumTransactions(
      expenses.filter((expense) => {
        if (expense.date.slice(0, 7) !== previousMonthKey) {
          return false;
        }

        return Number(expense.date.slice(8, 10)) <= now.getDate();
      }),
    );
    const upcomingThisMonth = computeUpcomingRecurringThisMonth(
      recurringExpenses,
      now,
    );
    const safeToSpend = computeSafeToSpend({
      monthlyBudget,
      spentThisMonth,
      upcomingRecurringThisMonth: upcomingThisMonth,
    });
    const daysRemaining = getDaysInMonth(now) - now.getDate() + 1;
    const dailyAllowance = computeDailyAllowance(safeToSpend, daysRemaining);
    const timeProgress = (now.getDate() / getDaysInMonth(now)) * 100;
    // Pace is measured on everyday spending only. Recurring bills land as real
    // expenses on their due date, so rent hitting on the 1st used to read as
    // "60% of the budget gone on day 1" and the hero cried "watch the pace"
    // for a fortnight while the user spent nothing. Fixed costs were always
    // planned; they say nothing about how fast you are going.
    const recurringSpentThisMonth = sumTransactions(
      monthExpenses.filter((expense) => expense.recurring_expense_id),
    );
    const everydaySpent = spentThisMonth - recurringSpentThisMonth;
    const everydayBudget = computeEverydayBudget(
      monthlyBudget,
      recurringSpentThisMonth + upcomingThisMonth,
    );
    const everydayProgress = computeBudgetProgress(
      everydaySpent,
      everydayBudget,
    );
    const status = resolveStatus({
      monthlyBudget,
      everydayBudget,
      safeToSpend,
      timeProgress,
      everydayProgress,
    });

    return {
      monthExpenses,
      spentThisMonth,
      spentLastMonth,
      spentLastMonthToDate,
      upcomingThisMonth,
      safeToSpend,
      dailyAllowance,
      daysRemaining,
      timeProgress,
      everydayBudget,
      everydayProgress,
      status,
      moneyPath: buildMoneyPath(monthExpenses, everydayBudget, now),
      upcomingWeek: buildUpcomingBills(recurringExpenses, now, {
        withinDays: 7,
        limit: 3,
      }),
      recentActivity: buildRecentActivity(expenses, incomes),
    };
  }, [
    expenses,
    incomes,
    monthKey,
    monthlyBudget,
    now,
    previousMonthKey,
    recurringExpenses,
  ]);

  const insights = useSpendingInsights({
    expenses,
    monthlyBudget,
    monthComparison: {
      thisMonthAmount: model.spentThisMonth,
      lastMonthAmount: model.spentLastMonth,
    },
    categories: expenseCategories,
    defaultCurrency,
  });

  return {
    ...model,
    insights: insights.slice(0, 2),
    monthLabel: format(now, 'LLLL', { locale: dateLocale }),
    greeting: resolveGreeting(now.getHours()),
    currency: defaultCurrency,
  };
};

// --- Helpers ---

const sumTransactions = (transactions: Expense[]): number =>
  sumSpending(transactions);

const computeDailyAllowance = (
  safeToSpend: number | null,
  daysRemaining: number,
): number | null => {
  if (safeToSpend === null) {
    return null;
  }
  if (daysRemaining <= 0) {
    return safeToSpend;
  }

  return safeToSpend / daysRemaining;
};

const computeBudgetProgress = (
  spentThisMonth: number,
  monthlyBudget: number | null,
): number => {
  if (!monthlyBudget || monthlyBudget <= 0) {
    return 0;
  }

  return (spentThisMonth / monthlyBudget) * 100;
};

// What is left to spend freely once every bill due this month is set aside.
// Null when there is no budget; can legitimately be <= 0 when fixed costs eat
// the whole budget, in which case there is no everyday pace to speak of.
const computeEverydayBudget = (
  monthlyBudget: number | null,
  recurringDueThisMonth: number,
): number | null => {
  if (monthlyBudget === null) {
    return null;
  }

  return monthlyBudget - recurringDueThisMonth;
};

type StatusInput = {
  monthlyBudget: number | null;
  everydayBudget: number | null;
  safeToSpend: number | null;
  timeProgress: number;
  everydayProgress: number;
};

const resolveStatus = (input: StatusInput): TodayStatus => {
  if (input.monthlyBudget === null) {
    return 'noBudget';
  }
  if (input.safeToSpend !== null && input.safeToSpend < 0) {
    return 'tight';
  }
  // Fixed costs already consume the budget, so there is no everyday allowance
  // whose pace could run ahead. safeToSpend >= 0 got us here, so say so calmly
  // rather than inventing a warning from a divide-by-nothing.
  if (input.everydayBudget === null || input.everydayBudget <= 0) {
    return 'comfortable';
  }
  if (input.everydayProgress > input.timeProgress + 8) {
    return 'watchful';
  }

  return 'comfortable';
};

// Plots the same series the status is judged on — everyday spend against the
// everyday budget. If this charted gross spend while the chip judged
// discretionary, the curve could sit above the guide line while the chip said
// "on track", and the hero would be arguing with itself.
const buildMoneyPath = (
  expenses: Expense[],
  everydayBudget: number | null,
  now: Date,
): MoneyPathPoint[] => {
  if (!everydayBudget || everydayBudget <= 0) {
    return [];
  }

  const dailyTotals = new Map<number, number>();
  for (const expense of expenses) {
    if (expense.recurring_expense_id) {
      continue;
    }
    if (!countsAsSpending(expense)) {
      continue;
    }

    const day = Number(expense.date.slice(8, 10));
    const current = dailyTotals.get(day) ?? 0;
    dailyTotals.set(day, current + expense.amount);
  }

  const points: MoneyPathPoint[] = [{ day: 0, budgetPercent: 0 }];
  let cumulative = 0;
  for (let day = 1; day <= now.getDate(); day += 1) {
    cumulative += dailyTotals.get(day) ?? 0;
    points.push({
      day,
      budgetPercent: (cumulative / everydayBudget) * 100,
    });
  }

  return points;
};

const buildRecentActivity = (
  expenses: Expense[],
  incomes: Expense[],
): RecentActivityItem[] => {
  const expenseItems = expenses.map((transaction) => ({
    transaction,
    kind: 'expense' as const,
  }));
  const incomeItems = incomes.map((transaction) => ({
    transaction,
    kind: 'income' as const,
  }));

  return [...expenseItems, ...incomeItems]
    .sort((a, b) => {
      const dateCompare = b.transaction.date.localeCompare(a.transaction.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return b.transaction.created_at.localeCompare(a.transaction.created_at);
    })
    .slice(0, 4);
};

const resolveGreeting = (hour: number): 'morning' | 'afternoon' | 'evening' => {
  if (hour < 12) {
    return 'morning';
  }
  if (hour < 18) {
    return 'afternoon';
  }

  return 'evening';
};
