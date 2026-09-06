import type { Expense } from '@/types/Expense';

// What deleting (or merging away) a category actually costs, so the confirm
// dialog can say something real instead of a generic warning. Expenses carry
// no snapshot of their category — only a live category_id — so this is the
// full, permanent set of rows that lose the label, not just "recent" ones.
export type CategoryImpact = {
  count: number;
  total: number;
  earliestDate: string | null;
};

export const getCategoryImpact = (
  expenses: Expense[],
  categoryId: string,
): CategoryImpact => {
  let count = 0;
  let total = 0;
  let earliestDate: string | null = null;

  for (const expense of expenses) {
    if (expense.category_id !== categoryId) continue;

    count += 1;
    total += expense.amount;
    if (earliestDate === null || expense.date < earliestDate) {
      earliestDate = expense.date;
    }
  }

  return { count, total, earliestDate };
};
