import { useMemo } from 'react';
import { format, getDaysInMonth, subDays, subMonths } from 'date-fns';
import {
  useCategoriesData,
  useAccountsData,
  useDataConfig,
  useGoalsData,
  useNoSpendDaysData,
  useRecurringData,
} from '@/contexts/DataContext';
import { computeUpcomingRecurringThisMonth } from '@/lib/forecast';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import { countsAsSpending, sumSpending } from '@/lib/spending';
import type { Goal } from '@/types/Goal';
import type { RecurringExpense } from '@/types/RecurringExpense';

// How a single day went against that month's everyday daily allowance.
// `quiet` is the honest fourth state: no expenses logged and no claim, which
// could equally be a perfect day or a day the app was never opened. It scores
// nothing rather than guessing.
export type DayOutcome = 'noSpend' | 'under' | 'over' | 'quiet';

type RhythmTone = 'thriving' | 'building' | 'starting';

export type RhythmDay = {
  key: string;
  outcome: DayOutcome;
  isToday: boolean;
};

export type SavingsRhythm = {
  days: RhythmDay[];
  windowDays: number;
  goodDays: number;
  tone: RhythmTone;
  todayClaimed: boolean;
  canClaimToday: boolean;
  // Everything below is about money that actually moved. `setAside` is the sum
  // of real savings transfers this month — never a hypothetical.
  surplusYesterday: number;
  setAside: number;
  setAsideToday: boolean;
  milestone: number;
  milestoneProgress: number;
  milestoneRemaining: number;
};

const WINDOW_DAYS = 30;
const THRIVING_DAYS = 15;
const BUILDING_DAYS = 6;

// Scores each day against the everyday daily allowance. The score is measured
// in days, not currency: no money moves when a day goes well, and a euro figure
// for money that never moved is a number the user cannot spend, withdraw or
// reconcile against anything. Currency appears only for real transfers.
//
// Returns null without a budget: an allowance is the whole basis of the score,
// and inventing one would make the card fiction. The Today hero drops its pace
// chart in exactly the same case.
export const useSavingsRhythm = (expenses: Expense[]): SavingsRhythm | null => {
  const noSpendDays = useNoSpendDaysData();
  const { recurringExpenses } = useRecurringData();
  const { expenseCategories } = useCategoriesData();
  const { monthlyBudget } = useDataConfig();

  return useMemo(() => {
    if (monthlyBudget === null || monthlyBudget <= 0) {
      return null;
    }

    const now = new Date();
    const thisMonth = format(now, 'yyyy-MM');
    const lastMonth = format(subMonths(now, 1), 'yyyy-MM');
    const savingsCategoryIds = buildSavingsCategoryIds(expenseCategories);
    // Consumption only. A transfer into savings leaves the spending pool but is
    // not spending — counting it would mean that setting aside your surplus
    // instantly destroys the surplus that earned it, and flips a good day to a
    // bad one. The mechanic would eat itself.
    const everyday = expenses.filter(
      (expense) => !savingsCategoryIds.has(expense.category_id ?? ''),
    );
    const claimed = new Set(noSpendDays.map((entry) => entry.day));
    const spendByDay = buildSpendByDay(everyday);
    const allowances = new Map([
      [
        thisMonth,
        computeAllowance(monthlyBudget, everyday, recurringExpenses, now, true),
      ],
      [
        lastMonth,
        computeAllowance(
          monthlyBudget,
          everyday,
          recurringExpenses,
          subMonths(now, 1),
          false,
        ),
      ],
    ]);

    const todayKey = format(now, 'yyyy-MM-dd');
    const yesterdayKey = format(subDays(now, 1), 'yyyy-MM-dd');
    const days = buildWindow(now, WINDOW_DAYS).map((key) => ({
      key,
      outcome: scoreDay(key, spendByDay, claimed, allowances),
      isToday: key === todayKey,
    }));
    const goodDays = days.filter((day) => isGoodDay(day.outcome)).length;
    const setAside = sumSetAside(expenses, savingsCategoryIds, thisMonth);

    return {
      days,
      windowDays: WINDOW_DAYS,
      goodDays,
      tone: resolveTone(goodDays),
      todayClaimed: claimed.has(todayKey),
      // Only offered on a day that genuinely has nothing on it. Once anything
      // is logged the claim would contradict the ledger, so it disappears.
      canClaimToday: !claimed.has(todayKey) && !spendByDay.has(todayKey),
      // Yesterday, not today: a day still in progress has no final surplus, and
      // offering one would invite setting aside money you then need.
      surplusYesterday: computeSurplus(
        yesterdayKey,
        spendByDay,
        claimed,
        allowances,
      ),
      setAside,
      setAsideToday: hasSetAsideOn(expenses, savingsCategoryIds, todayKey),
      ...buildMilestone(setAside),
    };
  }, [
    expenses,
    expenseCategories,
    monthlyBudget,
    noSpendDays,
    recurringExpenses,
  ]);
};

// Savings goals in this app are derived, not funded — progress is the sum of
// expenses in the goal's category. So a goal can only receive a set-aside if it
// is a category goal pointing at a savings category.
export const useSetAsideGoal = (): Goal | null => {
  const goals = useGoalsData();
  const { expenseCategories } = useCategoriesData();
  const { accounts } = useAccountsData();

  return useMemo(() => {
    const investmentAccountIds = new Set(
      accounts
        .filter(
          (account) => account.kind === 'investment' && !account.is_archived,
        )
        .map((account) => account.id),
    );
    const investmentGoal = goals.find((goal) => {
      if (goal.is_completed) {
        return false;
      }
      if (goal.source_type !== 'account') {
        return false;
      }

      return investmentAccountIds.has(goal.linked_account_id ?? '');
    });
    if (investmentGoal) {
      return investmentGoal;
    }

    const savingsCategoryIds = buildSavingsCategoryIds(expenseCategories);
    const eligible = goals.filter((goal) => {
      if (goal.is_completed) {
        return false;
      }
      if (goal.source_type !== 'category') {
        return false;
      }

      return savingsCategoryIds.has(goal.category_id ?? '');
    });

    return eligible[0] ?? null;
  }, [goals, expenseCategories, accounts]);
};

// --- Helpers ---

const isGoodDay = (outcome: DayOutcome): boolean =>
  outcome === 'noSpend' || outcome === 'under';

const buildSavingsCategoryIds = (categories: Category[]): Set<string> =>
  new Set(
    categories
      .filter((category) => category.kind === 'savings')
      .map((category) => category.id),
  );

// Everyday spend only, matching the pace model in useTodayGuidance: rent
// landing on the 1st is not a day you overspent, it is a bill you planned.
const buildSpendByDay = (expenses: Expense[]): Map<string, number> => {
  const byDay = new Map<string, number>();
  for (const expense of expenses) {
    if (expense.recurring_expense_id) {
      continue;
    }
    if (!countsAsSpending(expense)) {
      continue;
    }

    const current = byDay.get(expense.date) ?? 0;
    byDay.set(expense.date, current + expense.amount);
  }

  return byDay;
};

const scoreDay = (
  key: string,
  spendByDay: Map<string, number>,
  claimed: Set<string>,
  allowances: Map<string, number>,
): DayOutcome => {
  const spent = spendByDay.get(key);

  if (spent === undefined) {
    if (claimed.has(key)) {
      return 'noSpend';
    }

    return 'quiet';
  }
  if (spent > (allowances.get(key.slice(0, 7)) ?? 0)) {
    return 'over';
  }

  return 'under';
};

// What a finished day left over. Zero on a day that ran over — the offer is
// "here is real money you did not spend", and there is none on an over day.
const computeSurplus = (
  key: string,
  spendByDay: Map<string, number>,
  claimed: Set<string>,
  allowances: Map<string, number>,
): number => {
  const allowance = allowances.get(key.slice(0, 7)) ?? 0;
  if (allowance <= 0) {
    return 0;
  }

  const outcome = scoreDay(key, spendByDay, claimed, allowances);
  if (outcome === 'noSpend') {
    return allowance;
  }
  if (outcome !== 'under') {
    return 0;
  }

  // Refunds are legal, so a day's net spend can be negative. Capping at one
  // allowance stops a refund from offering money that was never saved.
  return Math.min(allowance - (spendByDay.get(key) ?? 0), allowance);
};

// Deliberately NOT filtered by countsAsSpending. Investment transfers are
// excluded from spending by design, while legacy savings-category transfers
// remain recognizable for people who created goals before account funding.
const sumSetAside = (
  expenses: Expense[],
  savingsCategoryIds: Set<string>,
  monthKey: string,
): number =>
  expenses
    .filter((expense) => expense.date.slice(0, 7) === monthKey)
    .filter((expense) => isSetAsideTransaction(expense, savingsCategoryIds))
    .reduce((sum, expense) => sum + expense.amount, 0);

const hasSetAsideOn = (
  expenses: Expense[],
  savingsCategoryIds: Set<string>,
  day: string,
): boolean =>
  expenses.some((expense) => {
    if (expense.date !== day) {
      return false;
    }

    return isSetAsideTransaction(expense, savingsCategoryIds);
  });

const isSetAsideTransaction = (
  expense: Expense,
  savingsCategoryIds: Set<string>,
): boolean => {
  if (expense.goal_id) {
    return true;
  }

  return savingsCategoryIds.has(expense.category_id ?? '');
};

// A near target that fills, rather than a distant one that looms. Motivation
// rises as a goal gets closer, so the ladder steps up only once each rung is
// cleared — several short bars completed beats one long bar that never is.
const MILESTONE_LADDER = [
  { upTo: 100, step: 25 },
  { upTo: 500, step: 50 },
];
const TOP_STEP = 100;

const buildMilestone = (setAside: number) => {
  const step = resolveStep(setAside);
  // Refunds are legal, so setAside can be negative — and floor(-10/25)*25+25
  // is 0, which made milestoneProgress -Infinity. The first rung is always a
  // real target.
  const milestone = Math.max(step, Math.floor(setAside / step) * step + step);

  return {
    milestone,
    milestoneProgress: (setAside / milestone) * 100,
    milestoneRemaining: milestone - setAside,
  };
};

const resolveStep = (setAside: number): number => {
  for (const rung of MILESTONE_LADDER) {
    if (setAside < rung.upTo) {
      return rung.step;
    }
  }

  return TOP_STEP;
};

// The everyday allowance for one day of a given month: the budget left once
// that month's fixed costs are set aside, spread evenly across its days.
const computeAllowance = (
  monthlyBudget: number,
  expenses: Expense[],
  recurringExpenses: RecurringExpense[],
  reference: Date,
  isCurrentMonth: boolean,
): number => {
  const monthKey = format(reference, 'yyyy-MM');
  const recurringSpent = sumSpending(
    expenses
      .filter((expense) => expense.date.slice(0, 7) === monthKey)
      .filter((expense) => expense.recurring_expense_id),
  );

  // Bills still to fall this month are already committed, so they come out of
  // the allowance now — otherwise every month would start generous and tighten.
  let upcoming = 0;
  if (isCurrentMonth) {
    upcoming = computeUpcomingRecurringThisMonth(recurringExpenses, reference);
  }

  const everydayBudget = monthlyBudget - recurringSpent - upcoming;
  if (everydayBudget <= 0) {
    return 0;
  }

  return everydayBudget / getDaysInMonth(reference);
};

const buildWindow = (now: Date, days: number): string[] => {
  const keys: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    keys.push(format(subDays(now, offset), 'yyyy-MM-dd'));
  }

  return keys;
};

const resolveTone = (goodDays: number): RhythmTone => {
  if (goodDays >= THRIVING_DAYS) {
    return 'thriving';
  }
  if (goodDays >= BUILDING_DAYS) {
    return 'building';
  }

  return 'starting';
};
