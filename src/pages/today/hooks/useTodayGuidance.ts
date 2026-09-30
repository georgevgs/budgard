import { useMemo } from 'react';
import { format, getDaysInMonth, subDays } from 'date-fns';
import {
  useCategoriesData,
  useDataConfig,
  useIncomesData,
  useRecurringData,
} from '@/common/contexts/DataContext';
import { useDateLocale } from '@/common/hooks/useDateLocale';
import { useSpendingInsights } from '@/common/hooks/useSpendingInsights';
import { useMonthlyPosition } from '@/common/hooks/useMonthlyPosition';
import { computeUpcomingRecurringThisMonth } from '@/constants/forecast';
import { buildUpcomingBills } from '@/pages/today/utils/upcomingBills';
import type { Expense } from '@/types/Expense';
import {
  buildSavingsCategoryIds,
  countsAsEverydaySpending,
  countsAsSpending,
  sumSpending,
} from '@/constants/spending';
import { sumAmounts } from '@/constants/money';
import { toIsoDate } from '@/constants/dates';
import { buildBaseline } from '@/constants/baseline';

export type TodayStatus = 'comfortable' | 'watchful' | 'tight' | 'noBudget';

export type RecentActivityItem = {
  transaction: Expense;
  kind: 'expense' | 'income';
};

export const useTodayGuidance = (
  expenses: Expense[],
  now: Date = new Date(),
) => {
  const incomes = useIncomesData();
  const { expenseCategories } = useCategoriesData();
  const { recurringExpenses } = useRecurringData();
  const { monthlyBudget, defaultCurrency } = useDataConfig();
  const { position } = useMonthlyPosition(expenses, now);
  const dateLocale = useDateLocale();
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
      monthExpenses,
    );
    const safeToSpend = position.available;
    const daysRemaining = getDaysInMonth(now) - now.getDate() + 1;
    const dailyAllowance = computeDailyAllowance(safeToSpend, daysRemaining);
    const savingsCategoryIds = buildSavingsCategoryIds(expenseCategories);
    const paceAllowance = computePaceAllowance(
      safeToSpend,
      sumEverydaySpending(monthExpenses, savingsCategoryIds, toIsoDate(now)),
      daysRemaining,
    );
    // What an ordinary day actually costs this person, from their own recent
    // history. Over plan there is no allowance left to quote, and a screen
    // that only says "you are past your plan" delivers a verdict and no way
    // forward — this is the way forward.
    const typicalDay = computeTypicalDay(expenses, now);
    const timeProgress = (now.getDate() / getDaysInMonth(now)) * 100;
    // Pace is measured on everyday spending only. Recurring bills land as real
    // expenses on their due date, so rent hitting on the 1st used to read as
    // "60% of the budget gone on day 1" and the hero cried "watch the pace"
    // for a fortnight while the user spent nothing. Fixed costs were always
    // planned; they say nothing about how fast you are going.
    //
    // Money moved into a savings category is left out for the same reason: it
    // is not consumed, and setting some aside must not read as a fast month.
    const recurringSpentThisMonth = sumTransactions(
      monthExpenses.filter((expense) => expense.recurring_expense_id),
    );
    const everydaySpent = sumEverydaySpending(
      monthExpenses,
      savingsCategoryIds,
    );
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
      // What the budget ring reads: the same outflow Plan's decision card
      // splits into Spent / Due / Save, never below zero. `spentThisMonth` is
      // spending alone, for month-on-month comparison, and a refund-heavy
      // month could take it negative — which drew a ring of negative length.
      budgetSpent: position.spent,
      spentLastMonth,
      spentLastMonthToDate,
      upcomingThisMonth,
      safeToSpend,
      dailyAllowance,
      paceAllowance,
      typicalDay,
      daysRemaining,
      timeProgress,
      everydayBudget,
      everydayProgress,
      status,
      upcomingWeek: buildUpcomingBills(recurringExpenses, now, {
        withinDays: 7,
        limit: 3,
      }),
      recentActivity: buildRecentActivity(expenses, incomes),
    };
  }, [
    expenseCategories,
    expenses,
    incomes,
    monthKey,
    monthlyBudget,
    now,
    position.available,
    position.spent,
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

const sumTransactions = (transactions: Expense[]): number =>
  sumSpending(transactions);

const sumEverydaySpending = (
  expenses: Expense[],
  savingsCategoryIds: ReadonlySet<string>,
  onDay?: string,
): number =>
  sumAmounts(
    expenses
      .filter((expense) => onDay === undefined || expense.date === onDay)
      .filter((expense) =>
        countsAsEverydaySpending(expense, savingsCategoryIds),
      )
      .map((expense) => expense.amount),
  );

// The yardstick the seven-day chart holds each bar against: the allowance as
// it stood when today began. `dailyAllowance` has today's spending taken out
// already, so measuring today's bar against it flagged a day spent exactly on
// plan as running hot.
const computePaceAllowance = (
  safeToSpend: number | null,
  spentToday: number,
  daysRemaining: number,
): number | null => {
  if (safeToSpend === null) {
    return null;
  }

  return computeDailyAllowance(safeToSpend + spentToday, daysRemaining);
};

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

const TYPICAL_DAY_WINDOW = 60;

// The median of the days money actually left the account. Days with no
// spending are left out on purpose: including them would halve the figure and
// describe an average day nobody has, rather than the shape of a normal one.
const computeTypicalDay = (expenses: Expense[], now: Date): number | null => {
  const cutoff = format(subDays(now, TYPICAL_DAY_WINDOW), 'yyyy-MM-dd');
  const byDay = new Map<string, number>();

  for (const expense of expenses) {
    if (expense.date < cutoff || !countsAsSpending(expense)) {
      continue;
    }
    byDay.set(expense.date, (byDay.get(expense.date) ?? 0) + expense.amount);
  }

  const days = [...byDay.values()].filter((total) => total > 0);
  const baseline = buildBaseline(days);
  if (baseline.count < 5) {
    return null;
  }

  return baseline.median;
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
