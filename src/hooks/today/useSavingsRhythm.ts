import { useMemo } from 'react';
import { format, getDaysInMonth, subDays, subMonths } from 'date-fns';
import {
  useDataConfig,
  useNoSpendDaysData,
  useRecurringData,
} from '@/contexts/DataContext';
import { computeUpcomingRecurringThisMonth } from '@/lib/forecast';
import type { Expense } from '@/types/Expense';
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
  banked: number;
  target: number | null;
  progress: number | null;
  remainingToTarget: number | null;
  todayClaimed: boolean;
  canClaimToday: boolean;
  tone: RhythmTone;
};

const WINDOW_DAYS = 30;
const THRIVING_DAYS = 15;
const BUILDING_DAYS = 6;

// Scores each day against the everyday daily allowance, and banks what was
// left over. Days that ran over bank zero rather than a negative — the pot is
// a record of the days that went well, never a debt. The honest month-to-date
// position already has a home: the hero's safe-to-spend.
//
// Returns null without a budget: an allowance is the whole basis of the score,
// and inventing one would make the meter fiction. The Today hero drops its
// pace chart in exactly the same case.
export const useSavingsRhythm = (expenses: Expense[]): SavingsRhythm | null => {
  const noSpendDays = useNoSpendDaysData();
  const { recurringExpenses } = useRecurringData();
  const { monthlyBudget } = useDataConfig();

  return useMemo(() => {
    if (monthlyBudget === null || monthlyBudget <= 0) {
      return null;
    }

    const now = new Date();
    const thisMonth = format(now, 'yyyy-MM');
    const lastMonth = format(subMonths(now, 1), 'yyyy-MM');
    const claimed = new Set(noSpendDays.map((entry) => entry.day));
    const spendByDay = buildSpendByDay(expenses);
    const allowances = new Map([
      [
        thisMonth,
        computeAllowance(monthlyBudget, expenses, recurringExpenses, now, true),
      ],
      [
        lastMonth,
        computeAllowance(
          monthlyBudget,
          expenses,
          recurringExpenses,
          subMonths(now, 1),
          false,
        ),
      ],
    ]);

    const scoreDay = (key: string): DayScore =>
      scoreSingleDay(key, spendByDay, claimed, allowances);

    const days = buildWindow(now, WINDOW_DAYS).map((key) => ({
      key,
      outcome: scoreDay(key).outcome,
      isToday: key === format(now, 'yyyy-MM-dd'),
    }));

    const banked = sumBanked(elapsedDaysOf(thisMonth, now).map(scoreDay));
    const target = resolveTarget(
      sumBanked(allDaysOf(lastMonth, subMonths(now, 1)).map(scoreDay)),
    );
    const todayKey = format(now, 'yyyy-MM-dd');

    return {
      days,
      windowDays: WINDOW_DAYS,
      goodDays: days.filter((day) => isGoodDay(day.outcome)).length,
      banked,
      target,
      progress: computeProgress(banked, target),
      remainingToTarget: computeRemaining(banked, target),
      todayClaimed: claimed.has(todayKey),
      // Only offered on a day that genuinely has nothing on it. Once anything
      // is logged the claim would contradict the ledger, so it disappears.
      canClaimToday: !claimed.has(todayKey) && !spendByDay.has(todayKey),
      tone: resolveTone(days.filter((day) => isGoodDay(day.outcome)).length),
    };
  }, [expenses, monthlyBudget, noSpendDays, recurringExpenses]);
};

// --- Helpers ---

type DayScore = {
  outcome: DayOutcome;
  banked: number;
};

const isGoodDay = (outcome: DayOutcome): boolean =>
  outcome === 'noSpend' || outcome === 'under';

// Everyday spend only, matching the pace model in useTodayGuidance: rent
// landing on the 1st is not a day you overspent, it is a bill you planned.
const buildSpendByDay = (expenses: Expense[]): Map<string, number> => {
  const byDay = new Map<string, number>();
  for (const expense of expenses) {
    if (expense.recurring_expense_id) {
      continue;
    }

    const current = byDay.get(expense.date) ?? 0;
    byDay.set(expense.date, current + expense.amount);
  }

  return byDay;
};

const scoreSingleDay = (
  key: string,
  spendByDay: Map<string, number>,
  claimed: Set<string>,
  allowances: Map<string, number>,
): DayScore => {
  const allowance = allowances.get(key.slice(0, 7)) ?? 0;
  const spent = spendByDay.get(key);

  if (spent === undefined) {
    if (claimed.has(key)) {
      return { outcome: 'noSpend', banked: Math.max(allowance, 0) };
    }

    return { outcome: 'quiet', banked: 0 };
  }
  if (spent > allowance) {
    return { outcome: 'over', banked: 0 };
  }

  // Refunds are legal, so a day's net spend can be negative. Capping the bank
  // at the allowance stops a refund from minting savings that never happened.
  return {
    outcome: 'under',
    banked: Math.min(Math.max(allowance - spent, 0), Math.max(allowance, 0)),
  };
};

// The everyday allowance for one day of a given month: the budget left once
// that month's fixed costs are set aside, spread evenly across its days.
//
// There is no history of past budgets — `monthlyBudget` is a single current
// scalar — so last month is scored against today's budget. It only feeds the
// "beat last month" target, where being a little off is far better than having
// no target at all.
const computeAllowance = (
  monthlyBudget: number,
  expenses: Expense[],
  recurringExpenses: RecurringExpense[],
  reference: Date,
  isCurrentMonth: boolean,
): number => {
  const monthKey = format(reference, 'yyyy-MM');
  const recurringSpent = expenses
    .filter((expense) => expense.date.slice(0, 7) === monthKey)
    .filter((expense) => expense.recurring_expense_id)
    .reduce((sum, expense) => sum + expense.amount, 0);

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

const elapsedDaysOf = (monthKey: string, reference: Date): string[] =>
  buildMonthDays(monthKey, reference.getDate());

const allDaysOf = (monthKey: string, reference: Date): string[] =>
  buildMonthDays(monthKey, getDaysInMonth(reference));

const buildMonthDays = (monthKey: string, upToDay: number): string[] => {
  const keys: string[] = [];
  for (let day = 1; day <= upToDay; day += 1) {
    keys.push(`${monthKey}-${String(day).padStart(2, '0')}`);
  }

  return keys;
};

const sumBanked = (scores: DayScore[]): number =>
  scores.reduce((sum, score) => sum + score.banked, 0);

// A target only exists once there is a real month to beat. Inventing one for a
// first-time user would set them chasing a number the app made up.
const resolveTarget = (lastMonthBanked: number): number | null => {
  if (lastMonthBanked <= 0) {
    return null;
  }

  return lastMonthBanked;
};

const computeProgress = (
  banked: number,
  target: number | null,
): number | null => {
  if (target === null) {
    return null;
  }

  return Math.min((banked / target) * 100, 100);
};

const computeRemaining = (
  banked: number,
  target: number | null,
): number | null => {
  if (target === null) {
    return null;
  }
  if (banked >= target) {
    return 0;
  }

  return target - banked;
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
