import { addWeeks, addMonths, addYears } from 'date-fns';
import type { RecurringExpense } from '@/types/RecurringExpense';

// Calendar-month approximations used to convert sub-monthly cadences into a
// single "monthly equivalent" figure. The exact ratio is 365.25 / 12 / 7 ≈
// 4.348 weeks/month; we round to 4.33 (and 2.17 for biweekly) to match the
// values most household-budgeting tools display. The drift is ≤0.5% per
// conversion and is acceptable for projection-style UIs that already round to
// the nearest unit. Do not change without updating tests that pin these.
export const WEEKS_PER_MONTH = 4.33;
export const BIWEEKLY_PERIODS_PER_MONTH = 2.17;

// Belt-and-braces cap. With a weekly cadence this covers ~19 years of
// catch-up; anything beyond that points to bad data (start_date in the
// distant past with no last_generated_date) and we'd rather bail than spin.
const MAX_CATCHUP_ITERATIONS = 1000;

export const calculateNextOccurrence = (
  expense: RecurringExpense,
): Date | null => {
  if (!expense.active) return null;
  if (expense.end_date && new Date(expense.end_date) < new Date()) return null;

  const startDate = new Date(expense.start_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (expense.last_generated_date) {
    const fromDate = new Date(expense.last_generated_date);

    return advanceByFrequency(fromDate, expense.frequency);
  }

  if (startDate >= today) {
    return startDate;
  }

  let next = new Date(startDate);
  let iterations = 0;
  while (next < today) {
    next = advanceByFrequency(next, expense.frequency);
    iterations += 1;
    if (iterations >= MAX_CATCHUP_ITERATIONS) {
      return null;
    }
  }

  return next;
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
): Date => {
  switch (frequency) {
    case 'weekly':
      return addWeeks(fromDate, 1);
    case 'biweekly':
      return addWeeks(fromDate, 2);
    case 'monthly':
      return addMonths(fromDate, 1);
    case 'quarterly':
      return addMonths(fromDate, 3);
    case 'yearly':
      return addYears(fromDate, 1);
    default:
      return addMonths(fromDate, 1);
  }
}
