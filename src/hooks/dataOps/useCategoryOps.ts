import { useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { CategoryBudget } from '@/types/CategoryBudget';
import { patchById, replaceById } from './helpers';
import { useShowErrorToast } from './useShowErrorToast';

export const useCategoryOps = () => {
  const { isInitialized } = useDataConfig();
  const {
    setCategories,
    setExpenses,
    setIncomes,
    setCategoryBudgets,
    refreshExpenses,
  } = useDataActions();
  const showErrorToast = useShowErrorToast();

  const handleCategoryAdd = useCallback(
    async (categoryData: Partial<Category>) => {
      if (!isInitialized) {
        return;
      }

      const optimisticCategory = {
        ...categoryData,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
      } as Category;

      setCategories((prev) => [...prev, optimisticCategory]);

      try {
        const savedCategory = await dataService.createCategory(categoryData);
        haptics.success();
        setCategories((prev) =>
          [
            ...prev.filter((c) => c.id !== optimisticCategory.id),
            savedCategory,
          ].sort((a, b) => a.name.localeCompare(b.name)),
        );
      } catch (error) {
        haptics.error();
        setCategories((prev) =>
          prev.filter((c) => c.id !== optimisticCategory.id),
        );
        Sentry.captureException(error, { tags: { operation: 'createCategory' } });
        showErrorToast('Failed to add category');
        throw error;
      }
    },
    [isInitialized, setCategories, showErrorToast],
  );

  const handleCategoryUpdate = useCallback(
    async (categoryId: string, categoryData: Partial<Category>) => {
      if (!isInitialized) {
        return;
      }

      let previousCategories: Category[] = [];
      setCategories((prev) => {
        previousCategories = prev;

        return patchById(prev, categoryId, categoryData).sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      });

      let previousExpenses: Expense[] = [];
      let previousIncomes: Expense[] = [];
      setExpenses((prev) => {
        previousExpenses = prev;

        return prev.map((e) => mergeCategoryPatch(e, categoryId, categoryData));
      });
      setIncomes((prev) => {
        previousIncomes = prev;

        return prev.map((i) => mergeCategoryPatch(i, categoryId, categoryData));
      });

      try {
        const saved = await dataService.updateCategory(
          categoryId,
          categoryData,
        );
        haptics.success();
        setCategories((prev) =>
          replaceById(prev, categoryId, saved).sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
        setExpenses((prev) =>
          prev.map((e) => assignCategory(e, categoryId, saved)),
        );
        setIncomes((prev) =>
          prev.map((i) => assignCategory(i, categoryId, saved)),
        );
      } catch (error) {
        haptics.error();
        setCategories(previousCategories);
        setExpenses(previousExpenses);
        setIncomes(previousIncomes);
        Sentry.captureException(error, { tags: { operation: 'updateCategory' } });
        showErrorToast('Failed to update category');
        throw error;
      }
    },
    [isInitialized, setCategories, setExpenses, setIncomes, showErrorToast],
  );

  const handleCategoryDelete = useCallback(
    async (categoryId: string) => {
      if (!isInitialized) {
        return;
      }

      let previousCategories: Category[] = [];
      setCategories((prev) => {
        previousCategories = prev;

        return prev.filter((c) => c.id !== categoryId);
      });

      setExpenses((prev) => prev.map((e) => clearCategoryRef(e, categoryId)));

      let previousBudgets: CategoryBudget[] = [];
      setCategoryBudgets((prev) => {
        previousBudgets = prev;

        return prev.filter((b) => b.category_id !== categoryId);
      });

      try {
        await dataService.deleteCategory(categoryId);
        haptics.success();
      } catch (error) {
        haptics.error();
        setCategories(previousCategories);
        setCategoryBudgets(previousBudgets);
        refreshExpenses();
        Sentry.captureException(error, { tags: { operation: 'deleteCategory' } });
        showErrorToast('Failed to delete category');
        throw error;
      }
    },
    [
      isInitialized,
      setCategories,
      setExpenses,
      setCategoryBudgets,
      refreshExpenses,
      showErrorToast,
    ],
  );

  const handleCategoriesAddBulk = useCallback(
    async (categoriesData: Partial<Category>[]) => {
      if (!isInitialized) return;

      try {
        const created = await Promise.all(
          categoriesData.map((cat) => dataService.createCategory(cat)),
        );
        haptics.success();
        setCategories((prev) =>
          [...prev, ...created].sort((a, b) => a.name.localeCompare(b.name)),
        );
      } catch (error) {
        haptics.error();
        Sentry.captureException(error, {
          tags: { operation: 'createCategoriesBulk' },
        });
        showErrorToast('Failed to create categories');
        throw error;
      }
    },
    [isInitialized, setCategories, showErrorToast],
  );

  return useMemo(
    () => ({
      handleCategoryAdd,
      handleCategoryUpdate,
      handleCategoryDelete,
      handleCategoriesAddBulk,
    }),
    [
      handleCategoryAdd,
      handleCategoryUpdate,
      handleCategoryDelete,
      handleCategoriesAddBulk,
    ],
  );
};

// --- Helpers ---

const mergeCategoryPatch = (
  row: Expense,
  categoryId: string,
  categoryData: Partial<Category>,
): Expense => {
  if (row.category_id !== categoryId || !row.category) return row;

  return { ...row, category: { ...row.category, ...categoryData } };
};

const assignCategory = (
  row: Expense,
  categoryId: string,
  saved: Category,
): Expense => {
  if (row.category_id !== categoryId) return row;

  return { ...row, category: saved };
};

const clearCategoryRef = (row: Expense, categoryId: string): Expense => {
  if (row.category_id !== categoryId) return row;

  return { ...row, category_id: undefined, category: undefined };
};
