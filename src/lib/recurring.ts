import { addWeeks } from 'date-fns';
import {
  addMonthsAnchored,
  anchorDayOf,
  parseIsoDate,
  startOfToday,
} from '@/lib/dates';
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
  if (!expense.active) return null;

  const today = startOfToday(now);

  // Both sides of this comparison are local midnight. Mixing a UTC-parsed
  // date with a local one used to drop the final occurrence on its end date,
  // and to skip a schedule's first occurrence when it started today.
  if (expense.end_date && parseIsoDate(expense.end_date) < today) return null;

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
}

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
}

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
}

// --- Helpers ---

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
}
