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
  startOfMonth,
} from 'date-fns';
import {
  collectOccurrences,
  getMonthlyAmount,
  restOfMonthWindow,
} from '@/constants/recurring';
import { sumAmounts } from '@/constants/money';
import { countsInTotals } from '@/constants/spending';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';

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

// Sums the actual amounts of recurring-expense occurrences still to come
// between tomorrow and the last day of the current month. Actual amounts —
// not monthly equivalents — because a quarterly 30 due next week costs 30
// this month, not 10, and a weekly item counts once per remaining occurrence.
//
// Plan's "rest of this month" timeline cuts the same window over the same
// schedules, so the list a reader opens from this figure totals this figure —
// by construction rather than by comment. `restOfMonthWindow` carries the
// reasoning for excluding a charge that falls today.
export const computeUpcomingRecurringThisMonth = (
  recurringExpenses: RecurringExpense[],
  now: Date,
): number => {
  const window = restOfMonthWindow(now);
  const due = recurringExpenses.flatMap((item) =>
    collectOccurrences(item, window).map(() => item.amount),
  );

  return sumAmounts(due);
};

// 12 months starting the month after `now`. Each month sums the
// monthly-equivalent recurring total (items live during that month) and the
// flat variable average (see module comment).
export const computeTwelveMonthProjection = (
  input: ProjectionInput,
): ProjectionMonth[] => {
  const { expenses, incomes, recurringExpenses, recurringIncomes, now } = input;
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
    (account) => !account.is_archived && SPENDABLE_KINDS.includes(account.kind),
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

const defaultMonthLabel = (monthStart: Date): string => {
  return format(monthStart, 'LLL yyyy');
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
  if (rows.length === 0) {
    return 0;
  }

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
    if (key < earliestKey) {
      break;
    }
    windowKeys.add(key);
  }
  if (windowKeys.size === 0) {
    return 0;
  }

  const counted: number[] = [];
  for (const row of rows) {
    if (row.recurring_expense_id) {
      continue;
    }
    if (!countsInTotals(row)) {
      continue;
    }
    if (!windowKeys.has(row.date.slice(0, 7))) {
      continue;
    }
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
    if (!item.active) {
      continue;
    }
    if (parseISO(item.start_date) > monthEnd) {
      continue;
    }
    if (item.end_date && parseISO(item.end_date) < monthStart) {
      continue;
    }
    live.push(getMonthlyAmount(item));
  }

  return sumAmounts(live);
};
