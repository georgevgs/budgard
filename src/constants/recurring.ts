import { addDays, addWeeks, endOfMonth, startOfDay } from 'date-fns';
import {
  addMonthsAnchored,
  anchorDayOf,
  parseIsoDate,
  startOfToday,
} from '@/constants/dates';
import type { RecurringExpense } from '@/types/RecurringExpense';

// Calendar-month approximations used to convert sub-monthly cadences into a
// single "monthly equivalent" figure. The exact ratio is 365.25 / 12 / 7 ≈
// 4.348 weeks/month; we round to 4.33 (and 2.17 for biweekly) to match the
// values most household-budgeting tools display. The drift is ≤0.5% per
// conversion and is acceptable for projection-style UIs that already round to
// the nearest unit. Do not change without updating tests that pin these.
const WEEKS_PER_MONTH = 4.33;
const BIWEEKLY_PERIODS_PER_MONTH = 2.17;

// Belt-and-braces cap. With a weekly cadence this covers ~19 years of
// catch-up; anything beyond that points to bad data (start_date in the
// distant past with no last_generated_date) and we'd rather bail than spin.
const MAX_CATCHUP_ITERATIONS = 1000;

export const calculateNextOccurrence = (
  expense: RecurringExpense,
  now: Date = new Date(),
): Date | null => {
  if (!expense.active) {
    return null;
  }

  const today = startOfToday(now);

  // Both sides of this comparison are local midnight. Mixing a UTC-parsed
  // date with a local one used to drop the final occurrence on its end date,
  // and to skip a schedule's first occurrence when it started today.
  if (expense.end_date && parseIsoDate(expense.end_date) < today) {
    return null;
  }

  const startDate = parseIsoDate(expense.start_date);

  if (expense.last_generated_date) {
    const fromDate = parseIsoDate(expense.last_generated_date);

    return advanceOccurrence(expense, fromDate);
  }

  if (startDate >= today) {
    return startDate;
  }

  let next = startDate;
  let iterations = 0;
  while (next < today) {
    next = advanceOccurrence(expense, next);
    iterations += 1;
    if (iterations >= MAX_CATCHUP_ITERATIONS) {
      return null;
    }
  }

  return next;
};

// The next occurrence of a schedule after `fromDate`, anchored on the
// schedule's own start day. Mirrors calculate_next_occurrence in
// 20260822000000_fix_recurring_anchor_and_exclusions.sql — the two must agree,
// because the DB generates the rows and the client previews them.
export const advanceOccurrence = (
  expense: Pick<RecurringExpense, 'frequency' | 'start_date'>,
  fromDate: Date,
): Date => {
  return advanceByFrequency(
    fromDate,
    expense.frequency,
    anchorDayOf(expense.start_date),
  );
};

export const getMonthlyAmount = (expense: RecurringExpense): number => {
  switch (expense.frequency) {
    case 'weekly':
      return expense.amount * WEEKS_PER_MONTH;
    case 'biweekly':
      return expense.amount * BIWEEKLY_PERIODS_PER_MONTH;
    case 'quarterly':
      return expense.amount / 3;
    case 'yearly':
      return expense.amount / 12;
    default:
      return expense.amount;
  }
};

const advanceByFrequency = (
  fromDate: Date,
  frequency: RecurringExpense['frequency'],
  anchorDay?: number,
): Date => {
  // Without an anchor the previous occurrence's own day is used, which is the
  // behaviour that drifts. Callers that have the schedule should pass its
  // start day — advanceOccurrence does that for them.
  const anchor = anchorDay ?? fromDate.getDate();

  switch (frequency) {
    case 'weekly':
      return addWeeks(fromDate, 1);
    case 'biweekly':
      return addWeeks(fromDate, 2);
    case 'monthly':
      return addMonthsAnchored(fromDate, 1, anchor);
    case 'quarterly':
      return addMonthsAnchored(fromDate, 3, anchor);
    case 'yearly':
      return addMonthsAnchored(fromDate, 12, anchor);
    default:
      return addMonthsAnchored(fromDate, 1, anchor);
  }
};

/**
 * Every charge a schedule makes inside a window, in calendar order.
 *
 * Three screens used to walk a schedule themselves — Today's seven-day bills,
 * Plan's timeline, and safe-to-spend's "still due this month" — and the three
 * walks disagreed. Two read a stale `last_generated_date` as "nothing is
 * coming" where the third caught the schedule up to the present, so a cron
 * that lagged removed a bill from the list while leaving it in the figure. A
 * list and the total that links to it cannot describe different months. This
 * is that walk, once.
 */
export type OccurrenceWindow = {
  /** Local midnight of the first day the window covers. */
  from: Date;
  /** Local midnight of the last day the window covers. Inclusive. */
  to: Date;
  /** Whether a charge falling on `from` itself belongs to the window. */
  includeFrom: boolean;
};

export const collectOccurrences = (
  expense: RecurringExpense,
  window: OccurrenceWindow,
): Date[] => {
  if (!expense.active) {
    return [];
  }

  let cursor = firstOccurrenceIn(expense, window);
  if (cursor === null) {
    return [];
  }

  const dates: Date[] = [];
  let iterations = 0;
  while (cursor <= window.to) {
    if (isPastEndDate(expense, cursor)) {
      break;
    }
    dates.push(cursor);
    cursor = advanceOccurrence(expense, cursor);
    iterations += 1;
    if (iterations >= MAX_CATCHUP_ITERATIONS) {
      break;
    }
  }

  return dates;
};

// The first charge at or after the window opens, catching a lagging schedule
// up to the present. A `last_generated_date` months behind means the cron has
// not run, not that the charge has stopped coming.
const firstOccurrenceIn = (
  expense: RecurringExpense,
  window: OccurrenceWindow,
): Date | null => {
  let cursor = seedOccurrence(expense);
  let iterations = 0;
  while (isBeforeWindow(cursor, window)) {
    cursor = advanceOccurrence(expense, cursor);
    iterations += 1;
    if (iterations >= MAX_CATCHUP_ITERATIONS) {
      return null;
    }
  }

  return cursor;
};

const seedOccurrence = (expense: RecurringExpense): Date => {
  if (expense.last_generated_date) {
    return advanceOccurrence(
      expense,
      parseIsoDate(expense.last_generated_date),
    );
  }

  return parseIsoDate(expense.start_date);
};

const isBeforeWindow = (cursor: Date, window: OccurrenceWindow): boolean => {
  if (window.includeFrom) {
    return cursor < window.from;
  }

  return cursor <= window.from;
};

const isPastEndDate = (expense: RecurringExpense, date: Date): boolean => {
  if (!expense.end_date) {
    return false;
  }

  return date > parseIsoDate(expense.end_date);
};

/**
 * The window "still to come this month" is cut from: tomorrow through the
 * last day of the current month.
 *
 * `includeFrom: false` is the load-bearing half. The cron writes the expense
 * row on its due date, so a charge falling today is already counted in this
 * month's spending; counting it again as still-to-come would take it out of
 * safe-to-spend twice. Safe-to-spend and Plan's month timeline both cut from
 * here, which is what makes the figure and the list it opens agree.
 */
export const restOfMonthWindow = (now: Date): OccurrenceWindow => ({
  from: startOfDay(now),
  to: endOfMonth(now),
  includeFrom: false,
});

/**
 * A plain forward-looking calendar window of `days` whole days from today.
 *
 * Today counts, unlike the month window above: this one answers "what is
 * about to leave the account", where a bill going out this morning is the
 * first thing worth seeing rather than a double count.
 */
export const nextDaysWindow = (now: Date, days: number): OccurrenceWindow => {
  const from = startOfDay(now);

  return { from, to: addDays(from, days), includeFrom: true };
};
