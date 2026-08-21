import { describe, expect, it } from 'vitest';
import { countsAsSpending, onlySpending, sumSpending } from '@/lib/spending';
import type { Expense } from '@/types/Expense';

const row = (overrides: Partial<Expense>): Expense =>
  ({
    id: 'x',
    amount: 10,
    description: 'x',
    date: '2026-08-01',
    user_id: 'u',
    created_at: '2026-08-01',
    ...overrides,
  }) as Expense;

describe('countsAsSpending', () => {
  it('counts a plain expense', () => {
    expect(countsAsSpending(row({}))).toBe(true);
    expect(countsAsSpending(row({ type: 'expense' }))).toBe(true);
  });

  it('never counts income', () => {
    expect(countsAsSpending(row({ type: 'income' }))).toBe(false);
  });

  // A debt payment leaves the account but reduces a liability rather than
  // consuming anything, so it has never counted as spending.
  it('never counts a debt payment', () => {
    expect(countsAsSpending(row({ type: 'debt_payment' }))).toBe(false);
  });

  it('does not count a row the user excluded', () => {
    expect(countsAsSpending(row({ is_excluded: true }))).toBe(false);
  });

  // The column defaults to false server-side, but a row hydrated from a
  // snapshot written before the column existed has it undefined.
  it('counts a row from before the column existed', () => {
    expect(countsAsSpending(row({ is_excluded: undefined }))).toBe(true);
  });
});

describe('sumSpending', () => {
  it('adds only what counts', () => {
    const total = sumSpending([
      row({ amount: 10 }),
      row({ amount: 100, type: 'income' }),
      row({ amount: 50, is_excluded: true }),
      row({ amount: 5 }),
    ]);

    expect(total).toBe(15);
  });

  it('is zero for an empty month', () => {
    expect(sumSpending([])).toBe(0);
  });

  // Refunds are stored as negative expenses, so they must reduce the total
  // rather than being filtered out as "not a cost".
  it('lets a refund reduce the total', () => {
    expect(sumSpending([row({ amount: 40 }), row({ amount: -15 })])).toBe(25);
  });
});

describe('onlySpending', () => {
  it('keeps order and drops the rest', () => {
    const rows = [
      row({ id: 'a' }),
      row({ id: 'b', type: 'income' }),
      row({ id: 'c', is_excluded: true }),
      row({ id: 'd' }),
    ];

    expect(onlySpending(rows).map((item) => item.id)).toEqual(['a', 'd']);
  });
});
