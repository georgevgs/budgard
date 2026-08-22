// Forecast math for the Pro "Forecast" analytics section.
//
// Projection approach: expenses generated from recurring items ARE
// identifiable — `expenses.recurring_expense_id` is a FK to
// `recurring_expenses` (migration 20250104165613_remote_schema.sql inserts
// generated rows with that FK set, for both expense and income types). So a
// projected month is:
//   monthly-equivalent total of active recurring items live that month
//   + average of NON-recurring-generated rows over the last 6 full months
//     (fewer when history is shorter).
// Splitting on the FK keeps recurring charges out of the variable average,
// so they are never double-counted.
//
// All date-dependent functions take an explicit `now` for testability.

import {
  addMonths,
  endOfMonth,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { advanceOccurrence, getMonthlyAmount } from '@/lib/recurring';
import { sumAmounts } from '@/lib/money';
import { countsInTotals } from '@/lib/spending';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';

// Same belt-and-braces cap as calculateNextOccurrence in lib/recurring.ts:
// with a weekly cadence this covers ~19 years of catch-up before we bail.
const MAX_OCCURRENCE_ITERATIONS = 1000;

export type SafeToSpendInput = {
  monthlyBudget: number | null;
  spentThisMonth: number;
  upcomingRecurringThisMonth: number;
};

export type ProjectionMonth = {
  monthKey: string;
  label: string;
  projectedExpenses: number;
  projectedIncome: number;
  projectedNet: number;
  // Running balance at the end of this month, once an opening balance is
  // known. Null when it is not — see openingBalance below.
  projectedBalance: number | null;
};

export type ProjectionInput = {
  expenses: Expense[];
  incomes: Expense[];
  recurringExpenses: RecurringExpense[];
  recurringIncomes: RecurringExpense[];
  now: Date;
  // Locale-aware labels are injected by the caller so this module stays free
  // of i18n dependencies. Defaults to e.g. "Aug 2026".
  formatMonthLabel?: (monthStart: Date) => string;
  // What the spendable accounts hold today. Null when the user tracks no cash
  // or bank account, in which case the projection reports flows only.
  //
  // A month's net is a rate; a balance is a position. "You will be 200 down in
  // November" is only alarming if you know whether you started the year with
  // 300 or 30,000, and the flows alone cannot say. This is what turns the
  // forecast from a chart into an answer to "will I make it to payday".
  openingBalance?: number | null;
};

// Budget minus what is already spent minus recurring bills still due before
// month end. Deliberately allowed to go negative — an honest "you are over"
// beats a clamped zero.
export const computeSafeToSpend = (input: SafeToSpendInput): number | null => {
  if (input.monthlyBudget === null) return null;

  return (
    input.monthlyBudget -
    input.spentThisMonth -
    input.upcomingRecurringThisMonth
  );
};

// Sums the actual amounts of recurring-expense occurrences that fall strictly
// after `now` (day granularity) and on or before the end of the current
// month. Actual amounts — not monthly equivalents — because a quarterly 30
// due next week costs 30 this month, not 10, and a weekly item counts once
// per remaining occurrence.
//
// Assumptions (matching lib/recurring.ts and the DB cron):
// - The item shape has no next_date/day_of_month column; the next charge
//   derives from last_generated_date + frequency, falling back to start_date.
// - A charge due today is excluded: the cron generates the expense row on the
//   due date, so today's charge lands in spentThisMonth — counting it here
//   would double-count it in safe-to-spend.
export const computeUpcomingRecurringThisMonth = (
  recurringExpenses: RecurringExpense[],
  now: Date,
): number => {
  const today = startOfDay(now);
  const monthEnd = endOfMonth(now);
  let total = 0;

  for (const item of recurringExpenses) {
    if (!item.active) continue;

    let cursor = findFirstOccurrenceAfter(item, today);
    let iterations = 0;
    const due: number[] = [];
    while (cursor !== null && cursor <= monthEnd) {
      if (isBeyondEndDate(item, cursor)) break;
      due.push(item.amount);
      cursor = advanceOccurrence(item, cursor);
      iterations += 1;
      if (iterations >= MAX_OCCURRENCE_ITERATIONS) break;
    }
    total = sumAmounts([total, ...due]);
  }

  return total;
};

// 12 months starting the month after `now`. Each month sums the
// monthly-equivalent recurring total (items live during that month) and the
// flat variable average (see module comment).
export const computeTwelveMonthProjection = (
  input: ProjectionInput,
): ProjectionMonth[] => {
  const { expenses, incomes, recurringExpenses, recurringIncomes, now } =
    input;
  const formatMonthLabel = input.formatMonthLabel ?? defaultMonthLabel;

  const variableExpenseAvg = computeVariableMonthlyAverage(expenses, now);
  const variableIncomeAvg = computeVariableMonthlyAverage(incomes, now);
  const months: ProjectionMonth[] = [];

  const opening = input.openingBalance ?? null;
  let running = opening;

  for (let offset = 1; offset <= 12; offset += 1) {
    const monthStart = addMonths(startOfMonth(now), offset);
    const projectedExpenses =
      sumRecurringForMonth(recurringExpenses, monthStart) + variableExpenseAvg;
    const projectedIncome =
      sumRecurringForMonth(recurringIncomes, monthStart) + variableIncomeAvg;
    const projectedNet = projectedIncome - projectedExpenses;

    if (running !== null) {
      running += projectedNet;
    }

    months.push({
      monthKey: format(monthStart, 'yyyy-MM'),
      label: formatMonthLabel(monthStart),
      projectedExpenses,
      projectedIncome,
      projectedNet,
      projectedBalance: running,
    });
  }

  return months;
};

// The first month the running balance is projected to go negative, or null if
// it never does within the window.
//
// Deliberately the *first* one rather than the lowest point: a shortfall in
// March is the thing to act on, and knowing that August is worse does not
// change what you do about March.
export const findFirstShortfall = (
  months: ProjectionMonth[],
): ProjectionMonth | null => {
  return (
    months.find(
      (month) => month.projectedBalance !== null && month.projectedBalance < 0,
    ) ?? null
  );
};

// What the accounts a person can actually spend from hold right now.
//
// Investments are excluded because selling them is a decision, not a payment,
// and counting them would quietly promise that a shortfall is covered by
// something the user may have no intention of touching. Liabilities are
// excluded for the mirror reason: a credit card balance is not cash you have.
export const computeSpendableBalance = (
  accounts: readonly SpendableAccount[],
): number | null => {
  const spendable = accounts.filter(
    (account) =>
      !account.is_archived && SPENDABLE_KINDS.includes(account.kind),
  );

  if (spendable.length === 0) {
    return null;
  }

  return sumAmounts(spendable.map((account) => account.current_balance));
};

type SpendableAccount = {
  kind: string;
  current_balance: number;
  is_archived: boolean;
};

const SPENDABLE_KINDS: readonly string[] = ['cash', 'bank'];

// --- Helpers ---

const defaultMonthLabel = (monthStart: Date): string => {
  return format(monthStart, 'LLL yyyy');
};

// First occurrence strictly after `today` (a startOfDay date). Row dates
// parse to local midnight, so `cursor <= today` treats a charge due today as
// already handled by the cron.
const findFirstOccurrenceAfter = (
  item: RecurringExpense,
  today: Date,
): Date | null => {
  let cursor: Date;
  if (item.last_generated_date) {
    cursor = advanceOccurrence(item, parseISO(item.last_generated_date));
  } else {
    cursor = parseISO(item.start_date);
  }

  let iterations = 0;
  while (cursor <= today) {
    cursor = advanceOccurrence(item, cursor);
    iterations += 1;
    if (iterations >= MAX_OCCURRENCE_ITERATIONS) return null;
  }

  return cursor;
};

const isBeyondEndDate = (item: RecurringExpense, date: Date): boolean => {
  if (!item.end_date) return false;

  return date > parseISO(item.end_date);
};

// Average of NON-recurring-generated rows over the last up-to-6 full months.
// Rows the user marked as not-spending are left out, so the projection rests
// on the same population as safe-to-spend rather than a wider one. This runs
// over incomes as well as expenses, so the predicate is countsInTotals rather
// than countsAsSpending — the latter rejects every income row.
// The current (partial) month is excluded. Months before the user's first
// transaction are excluded too, so a two-month-old account divides by 2, not
// 6 — but a windowed month with zero variable activity still counts as a
// real zero month. With no full month of history the average is 0.
const computeVariableMonthlyAverage = (rows: Expense[], now: Date): number => {
  if (rows.length === 0) return 0;

  // 'yyyy-MM' keys compare correctly as strings — no per-row parsing needed
  // (same pattern as useAnalyticsData).
  let earliestKey = rows[0].date.slice(0, 7);
  for (const row of rows) {
    const key = row.date.slice(0, 7);
    if (key < earliestKey) {
      earliestKey = key;
    }
  }

  const windowKeys = new Set<string>();
  for (let back = 1; back <= 6; back += 1) {
    const monthStart = addMonths(startOfMonth(now), -back);
    const key = format(monthStart, 'yyyy-MM');
    if (key < earliestKey) break;
    windowKeys.add(key);
  }
  if (windowKeys.size === 0) return 0;

  const counted: number[] = [];
  for (const row of rows) {
    if (row.recurring_expense_id) continue;
    if (!countsInTotals(row)) continue;
    if (!windowKeys.has(row.date.slice(0, 7))) continue;
    counted.push(row.amount);
  }

  return sumAmounts(counted) / windowKeys.size;
};

// Monthly-equivalent total of the recurring items live during the given
// month: active, started on or before the month's end, and not ended before
// the month's start.
const sumRecurringForMonth = (
  items: RecurringExpense[],
  monthStart: Date,
): number => {
  const monthEnd = endOfMonth(monthStart);
  const live: number[] = [];

  for (const item of items) {
    if (!item.active) continue;
    if (parseISO(item.start_date) > monthEnd) continue;
    if (item.end_date && parseISO(item.end_date) < monthStart) continue;
    live.push(getMonthlyAmount(item));
  }

  return sumAmounts(live);
};
