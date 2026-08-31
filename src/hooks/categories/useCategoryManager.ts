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

export type CategoryManagerView =
  | { type: 'list' }
  | { type: 'form'; category?: Category };

export const useCategoryManager = (categoryType: CategoryType) => {
  const { expenseCategories, incomeCategories } = useCategoriesData();
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const { handleCategoryDelete, handleCategoryMerge } = useCategoryOps();
  const { allow } = useProGate();
  const [view, setView] = useState<CategoryManagerView>({ type: 'list' });
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const categories = pickCategories(
    categoryType,
    expenseCategories,
    incomeCategories,
  );

  // Income categories only ever tag income rows, never expenses — the impact
  // preview has to read whichever slice this manager is actually editing.
  const deleteImpact = useMemo(() => {
    if (!deleteTarget) return null;

    const transactions = pickTransactions(categoryType, expenses, incomes);

    return getCategoryImpact(transactions, deleteTarget.id);
  }, [expenses, incomes, categoryType, deleteTarget]);

  const mergeCandidates = useMemo(
    () => categories.filter((c) => c.id !== deleteTarget?.id),
    [categories, deleteTarget],
  );

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
          await handleCategoryMerge(deleteTarget.id, destination);
        }
      } else {
        await handleCategoryDelete(deleteTarget.id);
      }
    } catch {
      // The error toast is raised by useCategoryOps.
    }
    setDeleteTarget(null);
  };

  return {
    categories,
    view,
    deleteTarget,
    deleteImpact,
    mergeCandidates,
    showList: () => setView({ type: 'list' }),
    editCategory: (category: Category) => setView({ type: 'form', category }),
    requestDelete: setDeleteTarget,
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
