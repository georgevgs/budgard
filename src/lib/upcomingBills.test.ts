import { describe, it, expect } from 'vitest';
import { buildUpcomingBills } from '@/lib/upcomingBills';
import { computeUpcomingRecurringThisMonth } from '@/lib/forecast';
import type { RecurringExpense } from '@/types/RecurringExpense';

// Deliberately NOT mocking @/lib/recurring. The point of this module is that
// Today, Plan and safe-to-spend describe the same commitments, and a mocked
// occurrence calendar cannot show that they do.

const NOW = new Date(2026, 7, 7, 10, 0, 0); // 7 Aug 2026, local

const bill = (overrides: Partial<RecurringExpense>): RecurringExpense =>
  ({
    id: 'r1',
    user_id: 'u1',
    amount: 10,
    description: 'Bill',
    frequency: 'monthly',
    start_date: '2026-01-08',
    active: true,
    created_at: '2026-01-08T00:00:00Z',
    ...overrides,
  }) as RecurringExpense;

describe('buildUpcomingBills', () => {
  it('keeps only occurrences inside the window', () => {
    const result = buildUpcomingBills(
      [
        bill({ id: 'tomorrow', amount: 10, start_date: '2026-08-08' }),
        bill({ id: 'in-20-days', amount: 20, start_date: '2026-08-27' }),
      ],
      NOW,
      { withinDays: 7, limit: 10 },
    );

    expect(result.items.map((entry) => entry.item.id)).toEqual(['tomorrow']);
    expect(result.count).toBe(1);
    expect(result.total).toBe(10);
  });

  it('includes today and the final day of the window', () => {
    const result = buildUpcomingBills(
      [
        bill({ id: 'today', amount: 5, start_date: '2026-08-07' }),
        bill({ id: 'last-day', amount: 7, start_date: '2026-08-14' }),
        bill({ id: 'just-past', amount: 9, start_date: '2026-08-15' }),
      ],
      NOW,
      { withinDays: 7, limit: 10 },
    );

    expect(result.items.map((entry) => entry.item.id)).toEqual([
      'today',
      'last-day',
    ]);
  });

  it('orders by soonest first', () => {
    const result = buildUpcomingBills(
      [
        bill({ id: 'later', amount: 1, start_date: '2026-08-12' }),
        bill({ id: 'sooner', amount: 1, start_date: '2026-08-09' }),
      ],
      NOW,
      { withinDays: 30, limit: 10 },
    );

    expect(result.items.map((entry) => entry.item.id)).toEqual([
      'sooner',
      'later',
    ]);
  });

  it('drops inactive items', () => {
    const result = buildUpcomingBills(
      [bill({ id: 'inactive', amount: 50, active: false })],
      NOW,
      { withinDays: 30, limit: 10 },
    );

    expect(result.count).toBe(0);
    expect(result.total).toBe(0);
  });

  it('limits displayed items but still totals the whole window', () => {
    const result = buildUpcomingBills(
      [
        bill({ id: 'a', amount: 10, start_date: '2026-08-08' }),
        bill({ id: 'b', amount: 20, start_date: '2026-08-09' }),
        bill({ id: 'c', amount: 30, start_date: '2026-08-10' }),
      ],
      NOW,
      { withinDays: 30, limit: 2 },
    );

    expect(result.items).toHaveLength(2);
    expect(result.count).toBe(3);
    expect(result.total).toBe(60);
  });

  it('counts every occurrence a weekly bill takes out of the window', () => {
    // Weekly 25 from 8 Aug, 30-day window from 7 Aug: 8, 15, 22, 29 Aug and
    // 5 Sep all land inside it. Counting the item once said 25 for something
    // that removes 125.
    const result = buildUpcomingBills(
      [
        bill({
          id: 'weekly',
          amount: 25,
          frequency: 'weekly',
          start_date: '2026-08-08',
        }),
      ],
      NOW,
      { withinDays: 30, limit: 10 },
    );

    expect(result.items[0].occurrences).toBe(5);
    expect(result.total).toBe(125);
    // Still one commitment in the list, five charges in the total.
    expect(result.count).toBe(1);
  });

  it('stops counting at the end date', () => {
    const result = buildUpcomingBills(
      [
        bill({
          id: 'ending',
          amount: 25,
          frequency: 'weekly',
          start_date: '2026-08-08',
          end_date: '2026-08-20',
        }),
      ],
      NOW,
      { withinDays: 30, limit: 10 },
    );

    // 8 and 15 Aug only.
    expect(result.items[0].occurrences).toBe(2);
    expect(result.total).toBe(50);
  });

  it('keeps a month-end bill on its anchor day', () => {
    const result = buildUpcomingBills(
      [
        bill({
          id: 'rent',
          amount: 900,
          start_date: '2026-01-31',
          last_generated_date: '2026-07-31',
        }),
      ],
      NOW,
      { withinDays: 30, limit: 10 },
    );

    expect(result.items[0].nextDate?.getDate()).toBe(31);
    expect(result.total).toBe(900);
  });

  it('agrees with safe-to-spend about what is still due this month', () => {
    // buildUpcomingBills counts from today inclusive; safe-to-spend excludes a
    // charge due today because the cron already generated it. Given a bill due
    // later this month and none due today, the two must land on the same
    // number — that agreement is the reason both exist.
    const items = [
      bill({ id: 'later-this-month', amount: 40, start_date: '2026-08-20' }),
    ];
    const daysLeftInAugust = 24; // 7 Aug → 31 Aug

    const upcoming = buildUpcomingBills(items, NOW, {
      withinDays: daysLeftInAugust,
      limit: 10,
    });

    expect(upcoming.total).toBe(computeUpcomingRecurringThisMonth(items, NOW));
  });
});
