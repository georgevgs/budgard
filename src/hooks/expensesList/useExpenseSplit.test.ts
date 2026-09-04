import { describe, it, expect } from 'vitest';
import {
  buildBalancedParts,
  isSettled,
} from '@/hooks/expensesList/useExpenseSplit';
import { sumAmounts } from '@/lib/money';
import type { Expense } from '@/types/Expense';

const expense = (amount: number): Expense =>
  ({ id: 'e1', amount, date: '2026-08-01', description: 'Dinner' }) as Expense;

const part = (amount: string) => ({ amount, category_id: 'none' });

describe('isSettled', () => {
  it('tolerates a rounding artefact the user cannot see', () => {
    expect(isSettled(0.004)).toBe(true);
    expect(isSettled(-0.004)).toBe(true);
  });

  it('does not tolerate a real difference', () => {
    expect(isSettled(0.01)).toBe(false);
    expect(isSettled(-5)).toBe(false);
  });
});

describe('buildBalancedParts', () => {
  it('leaves an exact split alone', () => {
    const rows = buildBalancedParts(expense(30), [
      part('10,00'),
      part('10,00'),
      part('10,00'),
    ]);

    expect(rows.map((row) => row.amount)).toEqual([10, 10, 10]);
  });

  it('absorbs the residual so the parts sum to the original exactly', () => {
    // 3,33 x 3 is 9,99 — isSettled accepts it, and writing it as-is destroyed
    // a cent on every split, below the precision that would ever show it.
    const rows = buildBalancedParts(expense(10), [
      part('3,33'),
      part('3,33'),
      part('3,33'),
    ]);

    expect(sumAmounts(rows.map((row) => row.amount))).toBe(10);
  });

  it('puts the residual on the largest part', () => {
    const rows = buildBalancedParts(expense(10), [part('2,00'), part('7,99')]);

    expect(rows.map((row) => row.amount)).toEqual([2, 8]);
  });

  it('balances a split of a refund', () => {
    const rows = buildBalancedParts(expense(-10), [
      part('3,33'),
      part('3,33'),
      part('3,33'),
    ]);

    expect(sumAmounts(rows.map((row) => row.amount))).toBe(-10);
  });

  it('carries the category through', () => {
    const rows = buildBalancedParts(expense(20), [
      { amount: '10,00', category_id: 'cat-1' },
      { amount: '10,00', category_id: 'none' },
    ]);

    expect(rows[0].category_id).toBe('cat-1');
    expect(rows[1].category_id).toBeNull();
  });

  it('never leaves the parts short, whatever the split', () => {
    const cases: [number, string[]][] = [
      [0.05, ['0,02', '0,02', '0,01']],
      [99.99, ['33,33', '33,33', '33,33']],
      [100, ['33,33', '33,33', '33,33']],
      [7.77, ['2,59', '2,59', '2,59']],
    ];

    for (const [total, amounts] of cases) {
      const rows = buildBalancedParts(expense(total), amounts.map(part));
      expect(sumAmounts(rows.map((row) => row.amount))).toBe(total);
    }
  });
});
