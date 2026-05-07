import { useMemo } from 'react';
import { format } from 'date-fns';
import type { Expense } from '@/types/Expense';

// Sums expenses for the current calendar month, grouped by category_id.
// Returns a Map keyed by category_id; categories with no expenses are absent.
// Uncategorised expenses (category_id === null/undefined) are dropped — they
// can't roll up against a per-category budget.
export const useCurrentMonthSpendingByCategory = (
  expenses: Expense[],
): Map<string, number> => {
  // monthKey must be a memo dep — otherwise an app left open across midnight
  // on the 1st keeps reporting the previous month's totals until expenses
  // change. expense.date is YYYY-MM-DD, so a prefix match avoids parseISO.
  const monthKey = format(new Date(), 'yyyy-MM');

  return useMemo(() => {
    const totals = new Map<string, number>();

    for (const expense of expenses) {
      if (!expense.category_id) continue;
      if (!expense.date.startsWith(monthKey)) continue;
      totals.set(
        expense.category_id,
        (totals.get(expense.category_id) ?? 0) + expense.amount,
      );
    }

    return totals;
  }, [expenses, monthKey]);
};
