import { useState } from 'react';
import { useCategoriesData } from '@/contexts/DataContext';
import { useCategoryOps } from '@/hooks/dataOps/useCategoryOps';
import { useProGate } from '@/hooks/pro/useProGate';
import type { Category, CategoryType } from '@/types/Category';

export type CategoryManagerView =
  | { type: 'list' }
  | { type: 'form'; category?: Category };

export const useCategoryManager = (categoryType: CategoryType) => {
  const { expenseCategories, incomeCategories } = useCategoriesData();
  const { handleCategoryDelete } = useCategoryOps();
  const { allow } = useProGate();
  const [view, setView] = useState<CategoryManagerView>({ type: 'list' });
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const categories = pickCategories(
    categoryType,
    expenseCategories,
    incomeCategories,
  );

  // The free cap counts each type separately (expense vs income sources).
  const handleAddClick = () => {
    if (!allow('categories', categories.length)) {
      return;
    }

    setView({ type: 'form' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await handleCategoryDelete(deleteTarget.id);
    } catch {
      // The error toast is raised by useCategoryOps.
    }
    setDeleteTarget(null);
  };

  return {
    categories,
    view,
    deleteTarget,
    showList: () => setView({ type: 'list' }),
    editCategory: (category: Category) => setView({ type: 'form', category }),
    requestDelete: setDeleteTarget,
    cancelDelete: () => setDeleteTarget(null),
    handleAddClick,
    handleDelete,
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
