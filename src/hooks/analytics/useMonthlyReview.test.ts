import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMonthlyReview } from '@/hooks/analytics/useMonthlyReview';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

const now = new Date(2026, 7, 26, 12);
const categories: Category[] = [
  {
    id: 'food',
    name: 'Food',
    color: '#000000',
    icon: null,
    user_id: 'user-1',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

const expense = (id: string, amount: number, date = '2026-08-20'): Expense => ({
  id,
  amount,
  description: 'Lunch',
  date,
  category_id: 'food',
  user_id: 'user-1',
  created_at: `${date}T12:00:00.000Z`,
});

describe('useMonthlyReview', () => {
  it('condenses comparison, top category and budget into three facts', () => {
    const { result } = renderHook(() =>
      useMonthlyReview({
        expenses: [expense('one', 65), expense('old', 40, '2026-07-10')],
        categories,
        comparison: {
          thisMonthLabel: 'August 2026',
          lastMonthLabel: 'July 2026',
          thisMonthAmount: 65,
          lastMonthAmount: 40,
          delta: 25,
          percentChange: 62.5,
        },
        monthlyBudget: 100,
        currency: 'EUR',
        now,
      }),
    );

    expect(result.current.items.map((item) => item.id)).toEqual([
      'comparison',
      'category',
      'budget',
    ]);
    expect(result.current.items).toHaveLength(3);
  });

  it('states an empty current month without inventing category detail', () => {
    const { result } = renderHook(() =>
      useMonthlyReview({
        expenses: [expense('old', 40, '2026-07-10')],
        categories,
        comparison: {
          thisMonthLabel: 'August 2026',
          lastMonthLabel: 'July 2026',
          thisMonthAmount: 0,
          lastMonthAmount: 40,
          delta: -40,
          percentChange: -100,
        },
        monthlyBudget: null,
        currency: 'EUR',
        now,
      }),
    );

    expect(result.current.items).toEqual([
      { id: 'comparison', text: 'analytics.review.noSpending' },
    ]);
  });
});
