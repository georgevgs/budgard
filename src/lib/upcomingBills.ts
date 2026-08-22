import { differenceInCalendarDays } from 'date-fns';
import { advanceOccurrence, calculateNextOccurrence } from '@/lib/recurring';
import { parseIsoDate, startOfToday } from '@/lib/dates';
import { sumAmounts } from '@/lib/money';
import type { RecurringExpense } from '@/types/RecurringExpense';

export type UpcomingEntry = {
  item: RecurringExpense;
  nextDate: Date | null;
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

// Belt-and-braces cap, matching lib/recurring.ts and lib/forecast.ts.
const MAX_OCCURRENCE_ITERATIONS = 1000;

// Shared by Today (a 7-day "what's about to leave" nudge) and Plan (a 30-day
// commitments list). Same ordering and same total in both, so the two screens
// can never disagree about what is coming up.
//
// The total counts every occurrence inside the window, not one per item. A
// weekly 25 due four times before the window closes takes 100 out of the
// account, and a commitments figure that said 25 was describing a different
// month from the one the user is looking at. This is the same rule
// computeUpcomingRecurringThisMonth uses, so Today, Plan and safe-to-spend
// now agree by construction.
export const buildUpcomingBills = (
  recurringExpenses: RecurringExpense[],
  now: Date,
  { withinDays, limit }: Options,
): UpcomingBills => {
  const entries = recurringExpenses
    .map((item) => buildEntry(item, now, withinDays))
    .filter((entry) => entry.occurrences > 0)
    .sort(compareByNextDate);

  return {
    items: entries.slice(0, limit),
    count: entries.length,
    total: sumAmounts(entries.map((entry) => entry.windowTotal)),
  };
};

// --- Helpers ---

const buildEntry = (
  item: RecurringExpense,
  now: Date,
  withinDays: number,
): UpcomingEntry => {
  const nextDate = calculateNextOccurrence(item, now);
  if (nextDate === null) {
    return { item, nextDate: null, occurrences: 0, windowTotal: 0 };
  }

  if (!isWithin(nextDate, now, withinDays)) {
    return { item, nextDate, occurrences: 0, windowTotal: 0 };
  }

  let cursor: Date | null = nextDate;
  let occurrences = 0;
  const due: number[] = [];

  while (cursor !== null && isWithin(cursor, now, withinDays)) {
    if (isBeyondEndDate(item, cursor)) break;
    due.push(item.amount);
    occurrences += 1;
    if (occurrences >= MAX_OCCURRENCE_ITERATIONS) break;
    cursor = advanceOccurrence(item, cursor);
  }

  return {
    item,
    nextDate,
    occurrences,
    windowTotal: sumAmounts(due),
  };
};

const isWithin = (date: Date, now: Date, withinDays: number): boolean => {
  const distance = differenceInCalendarDays(date, startOfToday(now));

  return distance >= 0 && distance <= withinDays;
};

const isBeyondEndDate = (item: RecurringExpense, date: Date): boolean => {
  if (!item.end_date) return false;

  return date > parseIsoDate(item.end_date);
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
