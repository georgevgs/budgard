import { differenceInCalendarDays, format } from 'date-fns';
import { parseIsoDate, startOfToday } from '@/lib/dates';
import { sumAmounts } from '@/lib/money';
import { advanceOccurrence, calculateNextOccurrence } from '@/lib/recurring';
import type { RecurringExpense } from '@/types/RecurringExpense';

export type MoneyTimelineKind = 'expense' | 'income';

export type MoneyTimelineEntry = {
  id: string;
  item: RecurringExpense;
  date: Date;
  kind: MoneyTimelineKind;
};

export type MoneyTimeline = {
  items: MoneyTimelineEntry[];
  count: number;
  remainingCount: number;
  incomeTotal: number;
  expenseTotal: number;
};

type Options = {
  withinDays: number;
  limit: number;
};

const MAX_OCCURRENCE_ITERATIONS = 1000;

export const buildMoneyTimeline = (
  recurringExpenses: RecurringExpense[],
  recurringIncomes: RecurringExpense[],
  now: Date,
  options: Options,
): MoneyTimeline => {
  const expenses = expandSchedules(
    recurringExpenses,
    'expense',
    now,
    options.withinDays,
  );
  const incomes = expandSchedules(
    recurringIncomes,
    'income',
    now,
    options.withinDays,
  );
  const entries = [...expenses, ...incomes].sort(compareEntries);
  const limit = Math.max(0, options.limit);
  const items = entries.slice(0, limit);

  return {
    items,
    count: entries.length,
    remainingCount: Math.max(0, entries.length - items.length),
    incomeTotal: sumAmounts(incomes.map((entry) => entry.item.amount)),
    expenseTotal: sumAmounts(expenses.map((entry) => entry.item.amount)),
  };
};

// --- Helpers ---

const expandSchedules = (
  schedules: RecurringExpense[],
  kind: MoneyTimelineKind,
  now: Date,
  withinDays: number,
): MoneyTimelineEntry[] => {
  return schedules.flatMap((item) =>
    expandSchedule(item, kind, now, withinDays),
  );
};

const expandSchedule = (
  item: RecurringExpense,
  kind: MoneyTimelineKind,
  now: Date,
  withinDays: number,
): MoneyTimelineEntry[] => {
  const entries: MoneyTimelineEntry[] = [];
  let cursor = calculateNextOccurrence(item, now);
  let iterations = 0;

  while (cursor !== null && isWithin(cursor, now, withinDays)) {
    if (isBeyondEndDate(item, cursor)) {
      break;
    }
    entries.push({
      id: `${kind}:${item.id}:${format(cursor, 'yyyy-MM-dd')}`,
      item,
      date: cursor,
      kind,
    });
    cursor = advanceOccurrence(item, cursor);
    iterations += 1;
    if (iterations >= MAX_OCCURRENCE_ITERATIONS) {
      break;
    }
  }

  return entries;
};

const isWithin = (date: Date, now: Date, withinDays: number): boolean => {
  const distance = differenceInCalendarDays(date, startOfToday(now));

  return distance >= 0 && distance <= withinDays;
};

const isBeyondEndDate = (item: RecurringExpense, date: Date): boolean => {
  if (!item.end_date) {
    return false;
  }

  return date > parseIsoDate(item.end_date);
};

const compareEntries = (
  first: MoneyTimelineEntry,
  second: MoneyTimelineEntry,
): number => {
  const dateDifference = first.date.getTime() - second.date.getTime();
  if (dateDifference !== 0) {
    return dateDifference;
  }
  if (first.kind === second.kind) {
    return first.item.description.localeCompare(second.item.description);
  }
  if (first.kind === 'income') {
    return -1;
  }

  return 1;
};
