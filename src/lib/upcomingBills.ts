import { differenceInCalendarDays } from 'date-fns';
import { calculateNextOccurrence } from '@/lib/recurring';
import type { RecurringExpense } from '@/types/RecurringExpense';

export type UpcomingEntry = {
  item: RecurringExpense;
  nextDate: Date | null;
};

export type UpcomingBills = {
  items: UpcomingEntry[];
  count: number;
  total: number;
};

type Options = {
  /** How far ahead to look, in whole days from `now`. */
  withinDays: number;
  /** How many entries to return for display. `count` still reports the total. */
  limit: number;
};

// Shared by Today (a 7-day "what's about to leave" nudge) and Plan (a 30-day
// commitments list). Same ordering and same total in both, so the two screens
// can never disagree about what is coming up.
export const buildUpcomingBills = (
  recurringExpenses: RecurringExpense[],
  now: Date,
  { withinDays, limit }: Options,
): UpcomingBills => {
  const entries = recurringExpenses
    .map((item) => ({ item, nextDate: calculateNextOccurrence(item) }))
    .filter((entry) => isWithin(entry, now, withinDays))
    .sort(compareByNextDate);

  return {
    items: entries.slice(0, limit),
    count: entries.length,
    total: entries.reduce((sum, entry) => sum + entry.item.amount, 0),
  };
};

// --- Helpers ---

const isWithin = (
  entry: UpcomingEntry,
  now: Date,
  withinDays: number,
): boolean => {
  if (entry.nextDate === null) {
    return false;
  }

  const distance = differenceInCalendarDays(entry.nextDate, now);

  return distance >= 0 && distance <= withinDays;
};

const compareByNextDate = (a: UpcomingEntry, b: UpcomingEntry): number => {
  if (a.nextDate === null) {
    return 1;
  }
  if (b.nextDate === null) {
    return -1;
  }

  return a.nextDate.getTime() - b.nextDate.getTime();
};
