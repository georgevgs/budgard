import { format } from 'date-fns';
import { sumAmounts } from '@/constants/money';
import {
  collectOccurrences,
  nextDaysWindow,
  restOfMonthWindow,
  type OccurrenceWindow,
} from '@/constants/recurring';
import type { RecurringExpense } from '@/types/RecurringExpense';

/** How far the rolling window looks ahead. Named here so the label the user
 *  reads and the window they get can never drift apart. */
export const TIMELINE_DAYS = 30;

export type MoneyTimelineKind = 'expense' | 'income';

/**
 * Which window Plan's timeline is showing.
 *
 * `month` is the one the budget is kept in: everything still to move between
 * tomorrow and the last day of this month, cut from the same window
 * safe-to-spend subtracts, so the list totals the "Due" figure that opens it.
 * `days` is a rolling calendar preview that crosses the month boundary — on
 * the 20th it shows next month's rent, which answers a different question.
 */
export type TimelineRange = 'month' | 'days';

export type MoneyTimelineEntry = {
  id: string;
  item: RecurringExpense;
  date: Date;
  kind: MoneyTimelineKind;
};

export type MoneyTimeline = {
  range: TimelineRange;
  items: MoneyTimelineEntry[];
  count: number;
  remainingCount: number;
  incomeTotal: number;
  expenseTotal: number;
  /** What the window leaves behind: income in, minus everything going out. */
  net: number;
  /** The last day the window covers — the date the totals are "by". */
  endsOn: Date;
};

type Options = {
  range: TimelineRange;
  /** Length of the rolling window. Ignored when the range is `month`. */
  withinDays: number;
  limit: number;
};

export const buildMoneyTimeline = (
  recurringExpenses: RecurringExpense[],
  recurringIncomes: RecurringExpense[],
  now: Date,
  options: Options,
): MoneyTimeline => {
  const window = resolveWindow(options, now);
  const expenses = expandSchedules(recurringExpenses, 'expense', window);
  const incomes = expandSchedules(recurringIncomes, 'income', window);
  const entries = [...expenses, ...incomes].sort(compareEntries);
  const limit = Math.max(0, options.limit);
  const items = entries.slice(0, limit);
  const incomeTotal = sumAmounts(incomes.map((entry) => entry.item.amount));
  const expenseTotal = sumAmounts(expenses.map((entry) => entry.item.amount));

  return {
    range: options.range,
    items,
    count: entries.length,
    remainingCount: Math.max(0, entries.length - items.length),
    incomeTotal,
    expenseTotal,
    net: sumAmounts([incomeTotal, -expenseTotal]),
    endsOn: window.to,
  };
};

const resolveWindow = (options: Options, now: Date): OccurrenceWindow => {
  if (options.range === 'month') {
    return restOfMonthWindow(now);
  }

  return nextDaysWindow(now, options.withinDays);
};

const expandSchedules = (
  schedules: RecurringExpense[],
  kind: MoneyTimelineKind,
  window: OccurrenceWindow,
): MoneyTimelineEntry[] => {
  return schedules.flatMap((item) => expandSchedule(item, kind, window));
};

const expandSchedule = (
  item: RecurringExpense,
  kind: MoneyTimelineKind,
  window: OccurrenceWindow,
): MoneyTimelineEntry[] => {
  return collectOccurrences(item, window).map((date) => ({
    id: `${kind}:${item.id}:${format(date, 'yyyy-MM-dd')}`,
    item,
    date,
    kind,
  }));
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
