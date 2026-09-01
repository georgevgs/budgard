import { describe, expect, it } from 'vitest';
import { buildMoneyTimeline } from '@/lib/moneyTimeline';
import type { RecurringExpense } from '@/types/RecurringExpense';

const NOW = new Date(2026, 8, 1, 12);

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

    const timeline = buildMoneyTimeline([weekly], [salary], NOW, {
      withinDays: 30,
      limit: 8,
    });

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
      withinDays: 30,
      limit: 2,
    });

    expect(timeline.count).toBe(3);
    expect(timeline.items).toHaveLength(2);
    expect(timeline.remainingCount).toBe(1);
  });

  it('ignores inactive and out-of-window schedules', () => {
    const inactive = schedule({ id: 'inactive', active: false });
    const later = schedule({ id: 'later', start_date: '2026-11-01' });

    const timeline = buildMoneyTimeline([inactive, later], [], NOW, {
      withinDays: 30,
      limit: 8,
    });

    expect(timeline).toMatchObject({
      items: [],
      count: 0,
      remainingCount: 0,
      incomeTotal: 0,
      expenseTotal: 0,
    });
  });
});

// --- Helpers ---

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
