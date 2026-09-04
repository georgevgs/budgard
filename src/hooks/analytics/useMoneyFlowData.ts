import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  useExpensesData,
  useIncomesData,
  useCategoriesData,
} from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { countsInTotals } from '@/lib/spending';
import { sumAmounts } from '@/lib/money';
import { swatch } from '@/design/palette';
import type { Category } from '@/types/Category';

// A synthetic row for spend with no category — a real and common case, unlike
// Monarch's demo data, so it needs a place in the flow rather than vanishing
// from the total.
export const UNCATEGORIZED_ID = '__uncategorized__';

// Any category past this rank folds into a single "Other" row. Real accounts
// can carry a dozen-plus categories; a branch per one of them stops reading
// as a chart.
const MAX_CATEGORY_ROWS = 7;
export const OTHER_ID = '__other__';

// Neither synthetic row is one real category, so no single picked colour
// represents it honestly — steel reads as "mixed", not as a colour choice.
const FOLD_COLOR: string = swatch.steel;

export type MoneyFlowCategory = {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  amount: number;
};

export type MoneyFlowData = {
  monthLabel: string;
  income: number;
  totalExpenses: number;
  savings: number;
  categories: MoneyFlowCategory[];
  isDeficit: boolean;
  hasData: boolean;
};

export const useMoneyFlowData = (now: Date = new Date()): MoneyFlowData => {
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const { expenseCategories: categories } = useCategoriesData();
  const dateLocale = useDateLocale();
  const monthKey = format(now, 'yyyy-MM');

  return useMemo(() => {
    const income = sumAmounts(
      incomes
        .filter(
          (row) => countsInTotals(row) && row.date.slice(0, 7) === monthKey,
        )
        .map((row) => row.amount),
    );

    const byCategory = new Map<string, number>();
    let uncategorized = 0;
    for (const expense of expenses) {
      if (!countsInTotals(expense)) continue;
      if (expense.date.slice(0, 7) !== monthKey) continue;
      if (!expense.category_id) {
        uncategorized += expense.amount;
        continue;
      }
      byCategory.set(
        expense.category_id,
        (byCategory.get(expense.category_id) ?? 0) + expense.amount,
      );
    }

    const categoryRows = buildCategoryRows(
      categories,
      byCategory,
      uncategorized,
    );
    const totalExpenses = sumAmounts(categoryRows.map((row) => row.amount));
    const savings = income - totalExpenses;

    return {
      monthLabel: format(now, 'LLLL yyyy', { locale: dateLocale }),
      income,
      totalExpenses,
      savings,
      categories: categoryRows,
      isDeficit: savings < 0,
      hasData: income > 0 || totalExpenses > 0,
    };
  }, [expenses, incomes, categories, monthKey, now, dateLocale]);
};

// --- Helpers ---

const buildCategoryRows = (
  categories: Category[],
  byCategory: Map<string, number>,
  uncategorized: number,
): MoneyFlowCategory[] => {
  const rows: MoneyFlowCategory[] = categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      amount: byCategory.get(category.id) ?? 0,
    }))
    .filter((row) => row.amount > 0);

  if (uncategorized > 0) {
    rows.push({
      id: UNCATEGORIZED_ID,
      name: '',
      icon: null,
      color: FOLD_COLOR,
      amount: uncategorized,
    });
  }

  rows.sort((a, b) => b.amount - a.amount);

  return foldTail(rows);
};

// Keeps the top rows as their own branches and folds everything past the cap
// into one "Other" row, rather than letting a long category list turn the
// chart into unreadable slivers.
const foldTail = (rows: MoneyFlowCategory[]): MoneyFlowCategory[] => {
  if (rows.length <= MAX_CATEGORY_ROWS) {
    return rows;
  }

  const kept = rows.slice(0, MAX_CATEGORY_ROWS - 1);
  const rest = rows.slice(MAX_CATEGORY_ROWS - 1);
  const otherAmount = sumAmounts(rest.map((row) => row.amount));

  kept.push({
    id: OTHER_ID,
    name: '',
    icon: null,
    color: FOLD_COLOR,
    amount: otherAmount,
  });

  return kept;
};
