import { format } from 'date-fns';
import { sumAmounts } from '@/constants/money';
import {
  buildGeneratedCharges,
  collectOccurrences,
  collectPendingOccurrences,
  nextDaysWindow,
  restOfMonthWindow,
  type OccurrenceWindow,
} from '@/constants/recurring';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';

/** How far the rolling window looks ahead. Named here so the label the user
 *  reads and the window they get can never drift apart. */
export const TIMELINE_DAYS = 30;

export type MoneyTimelineKind = 'expense' | 'income';

/**
 * Which window Plan's timeline is showing.
 *
 * `month` is the one the budget is kept in: everything still to move between
 * today and the last day of this month, cut from the same window safe-to-spend
 * subtracts and dropping the same already-written charges, so the list totals
 * the "Due" figure that opens it.
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
  /** The transactions already loaded. In the `month` range a charge that
   *  already has its row is spent, not still to move. */
  rows: ReadonlyArray<Pick<Expense, 'recurring_expense_id' | 'date'>>;
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
  const pending = resolvePending(options);
  const expenses = expandSchedules(
    recurringExpenses,
    'expense',
    window,
    pending,
  );
  const incomes = expandSchedules(recurringIncomes, 'income', window, pending);
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

type OccurrenceWalk = (
  item: RecurringExpense,
  window: OccurrenceWindow,
) => Date[];

// The month range lists what is still to move, so a charge already written is
// dropped. The rolling range is a calendar preview and keeps today's bill even
// once it has gone out — seeing it there is the point.
const resolvePending = (options: Options): OccurrenceWalk => {
  if (options.range !== 'month') {
    return collectOccurrences;
  }

  const generated = buildGeneratedCharges(options.rows);

  return (item, window) => collectPendingOccurrences(item, window, generated);
};

const expandSchedules = (
  schedules: RecurringExpense[],
  kind: MoneyTimelineKind,
  window: OccurrenceWindow,
  walk: OccurrenceWalk,
): MoneyTimelineEntry[] => {
  return schedules.flatMap((item) => expandSchedule(item, kind, window, walk));
};

const expandSchedule = (
  item: RecurringExpense,
  kind: MoneyTimelineKind,
  window: OccurrenceWindow,
  walk: OccurrenceWalk,
): MoneyTimelineEntry[] => {
  return walk(item, window).map((date) => ({
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
