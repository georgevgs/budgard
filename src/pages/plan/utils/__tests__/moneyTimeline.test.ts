import { describe, expect, it } from 'vitest';
import { endOfMonth } from 'date-fns';
import { buildMoneyTimeline } from '@/pages/plan/utils/moneyTimeline';
import { computeUpcomingRecurringThisMonth } from '@/constants/forecast';
import type { RecurringExpense } from '@/types/RecurringExpense';

const NOW = new Date(2026, 8, 1, 12); // 1 Sep 2026, local
// Late enough in the month that a rolling 30 days reaches into October — the
// case the month window exists to answer.
const LATE = new Date(2026, 8, 20, 12); // 20 Sep 2026, local

const days = { range: 'days', withinDays: 30, limit: 8 } as const;
const month = { range: 'month', withinDays: 30, limit: 8 } as const;

describe('buildMoneyTimeline', () => {
  it('expands, sorts and totals income and expense occurrences', () => {
    const weekly = schedule({
      id: 'weekly',
      amount: 10,
      description: 'Groceries',
      frequency: 'weekly',
      start_date: '2026-09-01',
    });
    const salary = schedule({
      id: 'salary',
      amount: 2000,
      description: 'Salary',
      start_date: '2026-09-05',
      type: 'income',
    });

    const timeline = buildMoneyTimeline([weekly], [salary], NOW, days);

    expect(timeline.count).toBe(6);
    expect(timeline.expenseTotal).toBe(50);
    expect(timeline.incomeTotal).toBe(2000);
    expect(timeline.items.map((entry) => entry.id)).toEqual([
      'expense:weekly:2026-09-01',
      'income:salary:2026-09-05',
      'expense:weekly:2026-09-08',
      'expense:weekly:2026-09-15',
      'expense:weekly:2026-09-22',
      'expense:weekly:2026-09-29',
    ]);
  });

  it('stops at the end date and reports hidden entries', () => {
    const weekly = schedule({
      id: 'short',
      frequency: 'weekly',
      start_date: '2026-09-01',
      end_date: '2026-09-15',
    });

    const timeline = buildMoneyTimeline([weekly], [], NOW, {
      ...days,
      limit: 2,
    });

    expect(timeline.count).toBe(3);
    expect(timeline.items).toHaveLength(2);
    expect(timeline.remainingCount).toBe(1);
  });

  it('ignores inactive and out-of-window schedules', () => {
    const inactive = schedule({ id: 'inactive', active: false });
    const later = schedule({ id: 'later', start_date: '2026-11-01' });

    const timeline = buildMoneyTimeline([inactive, later], [], NOW, days);

    expect(timeline).toMatchObject({
      items: [],
      count: 0,
      remainingCount: 0,
      incomeTotal: 0,
      expenseTotal: 0,
    });
  });
});

describe('buildMoneyTimeline, rest of the month', () => {
  it('stops at the last day of the month rather than 30 days out', () => {
    // Standing on the 20th, a rolling window shows next month's rent inside a
    // total the reader is reading as "this month". That is the confusion the
    // month window exists to remove.
    const rent = schedule({
      id: 'rent',
      amount: 800,
      start_date: '2026-01-05',
      last_generated_date: '2026-09-05',
    });
    const weekly = schedule({
      id: 'weekly',
      amount: 10,
      frequency: 'weekly',
      start_date: '2026-09-04',
    });

    const rolling = buildMoneyTimeline([rent, weekly], [], LATE, days);
    const restOfMonth = buildMoneyTimeline([rent, weekly], [], LATE, month);

    expect(rolling.items.map((entry) => entry.id)).toEqual([
      'expense:weekly:2026-09-25',
      'expense:weekly:2026-10-02',
      'expense:rent:2026-10-05',
      'expense:weekly:2026-10-09',
      'expense:weekly:2026-10-16',
    ]);
    expect(restOfMonth.items.map((entry) => entry.id)).toEqual([
      'expense:weekly:2026-09-25',
    ]);
    expect(restOfMonth.expenseTotal).toBe(10);
    expect(restOfMonth.endsOn).toEqual(endOfMonth(LATE));
  });

  it('leaves out a charge falling today, which the rolling window keeps', () => {
    // The cron writes the expense row on its due date, so today's charge is
    // already inside this month's spending. Listing it as still-to-come would
    // make the list disagree with the figure that opens it.
    const today = schedule({ id: 'today', start_date: '2026-09-01' });
    const ids = (options: typeof days | typeof month) =>
      buildMoneyTimeline([today], [], NOW, options).items.map(
        (entry) => entry.id,
      );

    expect(ids(days)).toContain('expense:today:2026-09-01');
    expect(ids(month)).toEqual([]);
  });

  it('nets income against expenses over the window', () => {
    const rent = schedule({ id: 'rent', amount: 800, start_date: '2026-09-10' });
    const salary = schedule({
      id: 'salary',
      amount: 2000,
      start_date: '2026-09-28',
      type: 'income',
    });

    const timeline = buildMoneyTimeline([rent], [salary], NOW, month);

    expect(timeline.expenseTotal).toBe(800);
    expect(timeline.incomeTotal).toBe(2000);
    expect(timeline.net).toBe(1200);
  });

  it('still lists a schedule whose cron run is behind', () => {
    // last_generated_date three months stale means the cron has not run, not
    // that the charge stopped coming. Safe-to-spend has always caught these
    // up; the list used to drop them, so the figure quoted money the list
    // could not account for.
    const lagging = schedule({
      id: 'lagging',
      amount: 30,
      start_date: '2026-01-20',
      last_generated_date: '2026-06-20',
    });

    const timeline = buildMoneyTimeline([lagging], [], NOW, month);

    expect(timeline.items.map((entry) => entry.id)).toEqual([
      'expense:lagging:2026-09-20',
    ]);
    expect(timeline.expenseTotal).toBe(30);
  });

  it('totals exactly what safe-to-spend holds back for the month', () => {
    // The contract behind the "Due" figure being a link to this list: both cut
    // the same window from the same schedules, so the list adds up to the
    // number that opened it. Break either walk and this fails.
    const items = [
      schedule({ id: 'weekly', amount: 12, frequency: 'weekly', start_date: '2026-09-02' }),
      schedule({ id: 'today', amount: 40, start_date: '2026-09-01' }),
      schedule({ id: 'quarterly', amount: 90, frequency: 'quarterly', start_date: '2026-06-18' }),
      schedule({ id: 'ending', amount: 25, frequency: 'weekly', start_date: '2026-09-03', end_date: '2026-09-17' }),
      schedule({ id: 'inactive', amount: 500, active: false }),
      schedule({ id: 'lagging', amount: 30, start_date: '2026-01-20', last_generated_date: '2026-06-20' }),
      schedule({ id: 'next-month', amount: 60, start_date: '2026-10-04' }),
    ];

    const timeline = buildMoneyTimeline(items, [], NOW, month);

    expect(timeline.expenseTotal).toBe(
      computeUpcomingRecurringThisMonth(items, NOW),
    );
    expect(timeline.expenseTotal).toBeGreaterThan(0);
  });
});

const schedule = (overrides: Partial<RecurringExpense>): RecurringExpense => ({
  id: 'schedule',
  user_id: 'user-1',
  amount: 25,
  description: 'Planned payment',
  frequency: 'monthly',
  start_date: '2026-09-03',
  created_at: '2026-08-01T00:00:00Z',
  active: true,
  type: 'expense',
  ...overrides,
});
