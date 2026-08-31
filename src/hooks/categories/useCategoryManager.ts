import { useMemo, useState } from 'react';
import {
  useCategoriesData,
  useExpensesData,
  useIncomesData,
} from '@/contexts/DataContext';
import { useCategoryOps } from '@/hooks/dataOps/useCategoryOps';
import { useProGate } from '@/hooks/pro/useProGate';
import { getCategoryImpact } from '@/lib/categoryDeleteImpact';
import type { Category, CategoryType } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { CategoryImpact } from '@/lib/categoryDeleteImpact';

export type CategoryManagerView =
  | { type: 'list' }
  | { type: 'form'; category?: Category };

// Snapshotted once, when the user taps delete — not recomputed live. A merge
// reassigns the affected rows' category_id as its very first (optimistic)
// step, so a live count would drop to zero mid-confirm and flip which dialog
// is open right under the user, closing the impact dialog and flashing the
// plain one before the mutation even finishes.
type DeleteTarget = {
  category: Category;
  impact: CategoryImpact;
};

export const useCategoryManager = (categoryType: CategoryType) => {
  const { expenseCategories, incomeCategories } = useCategoriesData();
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const { handleCategoryDelete, handleCategoryMerge } = useCategoryOps();
  const { allow } = useProGate();
  const [view, setView] = useState<CategoryManagerView>({ type: 'list' });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const categories = pickCategories(
    categoryType,
    expenseCategories,
    incomeCategories,
  );

  const mergeCandidates = useMemo(
    () => categories.filter((c) => c.id !== deleteTarget?.category.id),
    [categories, deleteTarget],
  );

  // Income categories only ever tag income rows, never expenses — the impact
  // preview has to read whichever slice this manager is actually editing.
  const requestDelete = (category: Category) => {
    const transactions = pickTransactions(categoryType, expenses, incomes);

    setDeleteTarget({
      category,
      impact: getCategoryImpact(transactions, category.id),
    });
  };

  // The free cap counts each type separately (expense vs income sources).
  const handleAddClick = () => {
    if (!allow('categories', categories.length)) {
      return;
    }

    setView({ type: 'form' });
  };

  // destinationCategoryId is null for "leave them Uncategorized" (a plain
  // delete); otherwise the expenses move to that category before it's gone.
  const handleConfirmDelete = async (destinationCategoryId: string | null) => {
    if (!deleteTarget) {
      return;
    }

    try {
      if (destinationCategoryId) {
        const destination = categories.find(
          (c) => c.id === destinationCategoryId,
        );
        if (destination) {
          await handleCategoryMerge(deleteTarget.category.id, destination);
        }
      } else {
        await handleCategoryDelete(deleteTarget.category.id);
      }
    } catch {
      // The error toast is raised by useCategoryOps.
    }
    setDeleteTarget(null);
  };

  return {
    categories,
    view,
    deleteTarget: deleteTarget?.category ?? null,
    deleteImpact: deleteTarget?.impact ?? null,
    mergeCandidates,
    showList: () => setView({ type: 'list' }),
    editCategory: (category: Category) => setView({ type: 'form', category }),
    requestDelete,
    cancelDelete: () => setDeleteTarget(null),
    handleAddClick,
    handleConfirmDelete,
  };
};

// --- Helpers ---

const pickCategories = (
  type: CategoryType,
  expenseCategories: Category[],
  incomeCategories: Category[],
): Category[] => {
  if (type === 'income') {
    return incomeCategories;
  }

  return expenseCategories;
};

const pickTransactions = (
  type: CategoryType,
  expenses: Expense[],
  incomes: Expense[],
): Expense[] => {
  if (type === 'income') {
    return incomes;
  }

  return expenses;
};
