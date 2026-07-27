import { useCallback, useMemo } from 'react';
import * as Sentry from '@/lib/sentry';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { CategoryBudget } from '@/types/CategoryBudget';
import { patchById, replaceById } from '@/hooks/dataOps/helpers';
import { useShowErrorToast } from '@/hooks/dataOps/useShowErrorToast';

export const useCategoryOps = () => {
  const { isInitialized } = useDataConfig();
  const {
    setCategories,
    setExpenses,
    setIncomes,
    setCategoryBudgets,
    refreshExpenses,
  } = useDataActions();
  const { t } = useTranslation();
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
        showErrorToast(t('categories.toasts.addFailed'));
        throw error;
      }
    },
    [isInitialized, setCategories, showErrorToast, t],
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
        showErrorToast(t('categories.toasts.updateFailed'));
        throw error;
      }
    },
    [isInitialized, setCategories, setExpenses, setIncomes, showErrorToast, t],
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
        showErrorToast(t('categories.toasts.deleteFailed'));
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
      t,
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
        showErrorToast(t('categories.toasts.bulkCreateFailed'));
        throw error;
      }
    },
    [isInitialized, setCategories, showErrorToast, t],
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
