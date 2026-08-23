import { useMemo } from 'react';
import { useCategoriesData } from '@/contexts/DataContext';
import { useCurrentMonthSpendingByCategory } from '@/hooks/useCurrentMonthSpendingByCategory';
import type { Expense } from '@/types/Expense';

export type TopCategory = {
  id: string;
  name: string;
  icon: string | null;
  amount: number;
};

/**
 * Where the most money went this month. One category, not a leaderboard — the
 * tile is a doorway into Trends, and a doorway only has to name the thing on
 * the other side of it.
 */
export const useTopCategory = (expenses: Expense[]): TopCategory | null => {
  const { expenseCategories } = useCategoriesData();
  const totals = useCurrentMonthSpendingByCategory(expenses);

  return useMemo(() => {
    let leaderId: string | null = null;
    let leaderAmount = 0;

    for (const [categoryId, amount] of totals) {
      if (amount > leaderAmount) {
        leaderId = categoryId;
        leaderAmount = amount;
      }
    }
    if (leaderId === null) {
      return null;
    }

    const category = expenseCategories.find((entry) => entry.id === leaderId);
    if (!category) {
      return null;
    }

    return {
      id: category.id,
      name: category.name,
      icon: category.icon,
      amount: leaderAmount,
    };
  }, [totals, expenseCategories]);
};
