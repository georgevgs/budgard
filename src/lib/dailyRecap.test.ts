import { describe, it, expect } from 'vitest';
import { buildDailyRecap } from './dailyRecap';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

const YESTERDAY = '2026-05-14';
const TWO_DAYS_AGO = '2026-05-13';

const expense = (overrides: Partial<Expense>): Expense => ({
  id: overrides.id ?? `e-${Math.random()}`,
  amount: overrides.amount ?? 10,
  description: 'Test',
  date: overrides.date ?? YESTERDAY,
  user_id: 'u1',
  created_at: '2026-05-14T00:00:00Z',
  ...overrides,
});

const category = (id: string, name: string): Category => ({
  id,
  name,
  color: '#FF6B00',
  icon: null,
  user_id: 'u1',
  created_at: '',
  type: 'expense',
});

describe('buildDailyRecap', () => {
  it('returns null when nothing happened yesterday', () => {
    expect(
      buildDailyRecap({ yesterday: YESTERDAY, expenses: [], categories: [] }),
    ).toBeNull();
  });

  it('returns null when only earlier expenses exist', () => {
    expect(
      buildDailyRecap({
        yesterday: YESTERDAY,
        expenses: [expense({ amount: 50, date: TWO_DAYS_AGO })],
        categories: [],
      }),
    ).toBeNull();
  });

  it('sums yesterday total and counts entries', () => {
    const recap = buildDailyRecap({
      yesterday: YESTERDAY,
      expenses: [
        expense({ amount: 10 }),
        expense({ amount: 15.5 }),
        expense({ amount: 100, date: TWO_DAYS_AGO }),
      ],
      categories: [],
    });
    expect(recap).not.toBeNull();
    expect(recap!.expenseTotal).toBeCloseTo(25.5);
    expect(recap!.expenseCount).toBe(2);
  });

  it('excludes debt_payment rows', () => {
    const recap = buildDailyRecap({
      yesterday: YESTERDAY,
      expenses: [
        expense({ amount: 10 }),
        expense({ amount: 500, type: 'debt_payment' }),
      ],
      categories: [],
    });
    expect(recap!.expenseTotal).toBe(10);
    expect(recap!.expenseCount).toBe(1);
  });

  it('groups by category and sorts descending', () => {
    const groc = category('cat-groc', 'Groceries');
    const cof = category('cat-cof', 'Coffee');
    const recap = buildDailyRecap({
      yesterday: YESTERDAY,
      expenses: [
        expense({ amount: 28.5, category_id: 'cat-groc' }),
        expense({ amount: 4.2, category_id: 'cat-cof' }),
        expense({ amount: 12, category_id: 'cat-cof' }),
      ],
      categories: [groc, cof],
    });

    expect(recap!.categoryLines).toHaveLength(2);
    expect(recap!.categoryLines[0].categoryName).toBe('Groceries');
    expect(recap!.categoryLines[1].amount).toBeCloseTo(16.2);
  });

  it('caps the category list at 3 rows', () => {
    const cats = [1, 2, 3, 4, 5].map((n) => category(`cat-${n}`, `C${n}`));
    const recap = buildDailyRecap({
      yesterday: YESTERDAY,
      expenses: cats.map((c, i) =>
        expense({ amount: 10 + i, category_id: c.id }),
      ),
      categories: cats,
    });
    expect(recap!.categoryLines).toHaveLength(3);
  });

  it('rolls uncategorised expenses into a single line', () => {
    const recap = buildDailyRecap({
      yesterday: YESTERDAY,
      expenses: [expense({ amount: 5 }), expense({ amount: 6 })],
      categories: [],
    });
    expect(recap!.categoryLines).toHaveLength(1);
    expect(recap!.categoryLines[0].categoryId).toBeNull();
    expect(recap!.categoryLines[0].amount).toBe(11);
  });
});
