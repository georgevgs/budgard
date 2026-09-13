import {
  collectOccurrences,
  nextDaysWindow,
  type OccurrenceWindow,
} from '@/constants/recurring';
import { sumAmounts } from '@/constants/money';
import type { RecurringExpense } from '@/types/RecurringExpense';

export type UpcomingEntry = {
  item: RecurringExpense;
  /** The soonest charge inside the window. Every entry has one. */
  nextDate: Date;
  /** How many times this item falls inside the window. */
  occurrences: number;
  /** What the item will actually take out over the window. */
  windowTotal: number;
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

// Today's "what's about to leave" nudge. The occurrence calendar itself lives
// in constants/recurring — this only shapes it for display.
//
// The total counts every occurrence inside the window, not one per item. A
// weekly 25 due four times before the window closes takes 100 out of the
// account, and a commitments figure that said 25 was describing a different
// month from the one the user is looking at.
export const buildUpcomingBills = (
  recurringExpenses: RecurringExpense[],
  now: Date,
  { withinDays, limit }: Options,
): UpcomingBills => {
  const window = nextDaysWindow(now, withinDays);
  const entries = recurringExpenses
    .map((item) => buildEntry(item, window))
    .filter(isPresent)
    .sort(compareByNextDate);

  return {
    items: entries.slice(0, limit),
    count: entries.length,
    total: sumAmounts(entries.map((entry) => entry.windowTotal)),
  };
};

const buildEntry = (
  item: RecurringExpense,
  window: OccurrenceWindow,
): UpcomingEntry | null => {
  const dates = collectOccurrences(item, window);
  if (dates.length === 0) {
    return null;
  }

  return {
    item,
    nextDate: dates[0],
    occurrences: dates.length,
    windowTotal: sumAmounts(dates.map(() => item.amount)),
  };
};

const isPresent = (entry: UpcomingEntry | null): entry is UpcomingEntry => {
  return entry !== null;
};

const compareByNextDate = (a: UpcomingEntry, b: UpcomingEntry): number => {
  return a.nextDate.getTime() - b.nextDate.getTime();
};
