import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

const MAX_CATEGORY_LINES = 3;

export type RecapCategoryLine = {
  categoryId: string | null;
  categoryName: string;
  color: string | null;
  amount: number;
};

export type DailyRecap = {
  yesterdayDate: string;
  expenseTotal: number;
  expenseCount: number;
  categoryLines: RecapCategoryLine[];
};

type BuildArgs = {
  yesterday: string;
  expenses: Expense[];
  categories: Category[];
};

export const buildDailyRecap = ({
  yesterday,
  expenses,
  categories,
}: BuildArgs): DailyRecap | null => {
  const yesterdayExpenses = expenses.filter(
    (e) => e.date === yesterday && e.type !== 'debt_payment',
  );
  if (yesterdayExpenses.length === 0) return null;

  const expenseTotal = yesterdayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const categoryLines = buildCategoryLines(yesterdayExpenses, categories);

  return {
    yesterdayDate: yesterday,
    expenseTotal,
    expenseCount: yesterdayExpenses.length,
    categoryLines,
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildCategoryLines = (
  yesterdayExpenses: Expense[],
  categories: Category[],
): RecapCategoryLine[] => {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();
  let uncategorisedAmount = 0;

  for (const e of yesterdayExpenses) {
    if (!e.category_id) {
      uncategorisedAmount += e.amount;
      continue;
    }
    totals.set(e.category_id, (totals.get(e.category_id) ?? 0) + e.amount);
  }

  const lines: RecapCategoryLine[] = [];
  for (const [categoryId, amount] of totals) {
    const category = byId.get(categoryId);
    if (!category) continue;

    lines.push({
      categoryId,
      categoryName: category.name,
      color: category.color,
      amount,
    });
  }

  if (uncategorisedAmount > 0) {
    lines.push({
      categoryId: null,
      categoryName: '',
      color: null,
      amount: uncategorisedAmount,
    });
  }

  lines.sort(compareByAmountDesc);

  return lines.slice(0, MAX_CATEGORY_LINES);
};

const compareByAmountDesc = (a: RecapCategoryLine, b: RecapCategoryLine) =>
  b.amount - a.amount;
