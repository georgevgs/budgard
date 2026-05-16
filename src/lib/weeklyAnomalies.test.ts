import { describe, it, expect } from 'vitest';
import { format, subDays } from 'date-fns';
import { buildWeeklyRecap } from './weeklyAnomalies';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

const NOW = new Date('2026-05-17T12:00:00Z');

const category = (id: string, name: string): Category => ({
  id,
  name,
  color: '#FF6B00',
  icon: null,
  user_id: 'u1',
  created_at: '',
  type: 'expense',
});

const expense = (overrides: Partial<Expense>): Expense => ({
  id: overrides.id ?? `e-${Math.random()}`,
  amount: overrides.amount ?? 10,
  description: 'Test',
  date: overrides.date ?? format(NOW, 'yyyy-MM-dd'),
  user_id: 'u1',
  created_at: '2026-05-17T00:00:00Z',
  ...overrides,
});

// Build N evenly spaced baseline expenses across the 90-day window.
const baselineSeries = (
  categoryId: string,
  amountEach: number,
  count: number,
): Expense[] => {
  // Start 8 days ago (just outside the current week) and walk further back.
  const start = subDays(NOW, 8);
  const step = Math.max(1, Math.floor(85 / count));

  return Array.from({ length: count }, (_, i) =>
    expense({
      amount: amountEach,
      category_id: categoryId,
      date: format(subDays(start, i * step), 'yyyy-MM-dd'),
    }),
  );
};

describe('buildWeeklyRecap', () => {
  it('returns null when no expenses landed in the past 7 days', () => {
    const recap = buildWeeklyRecap({
      now: NOW,
      expenses: baselineSeries('cat-groc', 30, 12),
      categories: [category('cat-groc', 'Groceries')],
    });

    expect(recap).toBeNull();
  });

  it('flags an upward anomaly when this week is well above baseline', () => {
    const recap = buildWeeklyRecap({
      now: NOW,
      expenses: [
        ...baselineSeries('cat-groc', 30, 12), // ~€28/week baseline
        expense({
          amount: 80,
          category_id: 'cat-groc',
          date: format(NOW, 'yyyy-MM-dd'),
        }),
      ],
      categories: [category('cat-groc', 'Groceries')],
    });

    expect(recap).not.toBeNull();
    const anomaly = recap!.anomalies.find((a) => a.categoryId === 'cat-groc');
    expect(anomaly).toBeDefined();
    expect(anomaly!.direction).toBe('up');
    expect(anomaly!.ratio).toBeGreaterThan(1.5);
  });

  it('flags a downward anomaly when this week is well below baseline', () => {
    const recap = buildWeeklyRecap({
      now: NOW,
      // Heavy baseline: ~€7.7/week per item, 24 items → ~€185/week
      expenses: [
        ...baselineSeries('cat-eat', 100, 24),
        expense({
          amount: 20,
          category_id: 'cat-eat',
          date: format(NOW, 'yyyy-MM-dd'),
        }),
      ],
      categories: [category('cat-eat', 'Eating out')],
    });

    const anomaly = recap!.anomalies.find((a) => a.categoryId === 'cat-eat');
    expect(anomaly).toBeDefined();
    expect(anomaly!.direction).toBe('down');
    expect(anomaly!.ratio).toBeLessThan(0.5);
  });

  it('ignores categories with too few baseline transactions', () => {
    const recap = buildWeeklyRecap({
      now: NOW,
      expenses: [
        // Only 2 baseline transactions → not enough signal
        expense({
          amount: 200,
          category_id: 'cat-rare',
          date: format(subDays(NOW, 60), 'yyyy-MM-dd'),
        }),
        expense({
          amount: 200,
          category_id: 'cat-rare',
          date: format(subDays(NOW, 40), 'yyyy-MM-dd'),
        }),
        expense({
          amount: 100,
          category_id: 'cat-rare',
          date: format(NOW, 'yyyy-MM-dd'),
        }),
      ],
      categories: [category('cat-rare', 'Rare')],
    });

    expect(recap!.anomalies).toHaveLength(0);
  });

  it('excludes debt payments from both windows', () => {
    const recap = buildWeeklyRecap({
      now: NOW,
      expenses: [
        ...baselineSeries('cat-x', 10, 12),
        expense({
          amount: 500,
          category_id: 'cat-x',
          date: format(NOW, 'yyyy-MM-dd'),
          type: 'debt_payment',
        }),
      ],
      categories: [category('cat-x', 'X')],
    });

    expect(recap).toBeNull();
  });

  it('returns the week total and entry count for the past 7 days', () => {
    const recap = buildWeeklyRecap({
      now: NOW,
      expenses: [
        expense({ amount: 12, date: format(NOW, 'yyyy-MM-dd') }),
        expense({ amount: 18, date: format(subDays(NOW, 3), 'yyyy-MM-dd') }),
        expense({ amount: 999, date: format(subDays(NOW, 8), 'yyyy-MM-dd') }),
      ],
      categories: [],
    });

    expect(recap!.weekTotal).toBeCloseTo(30);
    expect(recap!.weekCount).toBe(2);
  });

  it('caps anomalies at 3', () => {
    const cats = [1, 2, 3, 4, 5].map((n) => category(`cat-${n}`, `C${n}`));
    const expenses: Expense[] = [];
    for (const c of cats) {
      expenses.push(...baselineSeries(c.id, 10, 12)); // ~€9/week
      expenses.push(
        expense({
          amount: 80,
          category_id: c.id,
          date: format(NOW, 'yyyy-MM-dd'),
        }),
      );
    }

    const recap = buildWeeklyRecap({ now: NOW, expenses, categories: cats });

    expect(recap!.anomalies.length).toBeLessThanOrEqual(3);
  });

  it('ranks upward anomalies before downward ones, then by deviation', () => {
    const recap = buildWeeklyRecap({
      now: NOW,
      expenses: [
        // Up: ~3× normal
        ...baselineSeries('cat-up', 10, 12),
        expense({
          amount: 30,
          category_id: 'cat-up',
          date: format(NOW, 'yyyy-MM-dd'),
        }),
        // Down: well below normal
        ...baselineSeries('cat-down', 50, 24),
        expense({
          amount: 5,
          category_id: 'cat-down',
          date: format(NOW, 'yyyy-MM-dd'),
        }),
      ],
      categories: [
        category('cat-up', 'Up category'),
        category('cat-down', 'Down category'),
      ],
    });

    expect(recap!.anomalies[0].direction).toBe('up');
  });
});
