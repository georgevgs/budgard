import { describe, it, expect, vi } from 'vitest';
import { buildUpcomingBills } from '@/lib/upcomingBills';
import type { RecurringExpense } from '@/types/RecurringExpense';

vi.mock('@/lib/recurring', () => ({
  calculateNextOccurrence: (item: { next_due?: string | null }) => {
    if (!item.next_due) {
      return null;
    }

    return new Date(item.next_due);
  },
}));

const NOW = new Date('2026-08-07T10:00:00Z');

const bill = (id: string, amount: number, nextDue: string | null) =>
  ({ id, amount, next_due: nextDue, description: id }) as unknown as
    RecurringExpense;

describe('buildUpcomingBills', () => {
  it('keeps only occurrences inside the window', () => {
    const result = buildUpcomingBills(
      [
        bill('tomorrow', 10, '2026-08-08T00:00:00Z'),
        bill('in-20-days', 20, '2026-08-27T00:00:00Z'),
        bill('yesterday', 30, '2026-08-06T00:00:00Z'),
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
        bill('today', 5, '2026-08-07T23:00:00Z'),
        bill('last-day', 7, '2026-08-14T00:00:00Z'),
        bill('just-past', 9, '2026-08-15T00:00:00Z'),
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
        bill('later', 1, '2026-08-12T00:00:00Z'),
        bill('sooner', 1, '2026-08-09T00:00:00Z'),
      ],
      NOW,
      { withinDays: 30, limit: 10 },
    );

    expect(result.items.map((entry) => entry.item.id)).toEqual([
      'sooner',
      'later',
    ]);
  });

  it('drops entries with no next occurrence', () => {
    const result = buildUpcomingBills([bill('inactive', 50, null)], NOW, {
      withinDays: 30,
      limit: 10,
    });

    expect(result.count).toBe(0);
    expect(result.total).toBe(0);
  });

  it('limits displayed items but still totals the whole window', () => {
    const result = buildUpcomingBills(
      [
        bill('a', 10, '2026-08-08T00:00:00Z'),
        bill('b', 20, '2026-08-09T00:00:00Z'),
        bill('c', 30, '2026-08-10T00:00:00Z'),
      ],
      NOW,
      { withinDays: 30, limit: 2 },
    );

    expect(result.items).toHaveLength(2);
    expect(result.count).toBe(3);
    expect(result.total).toBe(60);
  });
});
