import { addWeeks, addMonths, addYears } from 'date-fns';
import type { RecurringExpense } from '@/types/RecurringExpense';

const WEEKS_PER_MONTH = 4.33;
const BIWEEKLY_PERIODS_PER_MONTH = 2.17;

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
  while (next < today) {
    next = advanceByFrequency(next, expense.frequency);
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
