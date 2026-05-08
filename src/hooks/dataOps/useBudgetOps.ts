import { useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { CategoryBudget } from '@/types/CategoryBudget';
import { useShowErrorToast } from './useShowErrorToast';

export const useBudgetOps = () => {
  const { isInitialized, monthlyBudget } = useDataConfig();
  const { setMonthlyBudget, setCategoryBudgets } = useDataActions();
  const showErrorToast = useShowErrorToast();

  const handleBudgetUpdate = useCallback(
    async (amount: number) => {
      const previousBudget = monthlyBudget;
      setMonthlyBudget(amount);

      try {
        await dataService.upsertBudget(amount);
      } catch (error) {
        haptics.error();
        setMonthlyBudget(previousBudget);
        Sentry.captureException(error, { tags: { operation: 'upsertBudget' } });
        showErrorToast('Failed to update budget');
        throw error;
      }
    },
    [monthlyBudget, setMonthlyBudget, showErrorToast],
  );

  const handleCategoryBudgetUpsert = useCallback(
    async (categoryId: string, amount: number) => {
      if (!isInitialized) return;

      let previousBudgets: CategoryBudget[] = [];
      const optimisticBudget: CategoryBudget = {
        id: `temp-${Date.now()}`,
        user_id: '',
        category_id: categoryId,
        monthly_amount: amount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCategoryBudgets((prev) => {
        previousBudgets = prev;
        const existing = prev.find((b) => b.category_id === categoryId);
        if (existing) {
          return prev.map((b) => bumpBudgetAmount(b, categoryId, amount));
        }

        return [...prev, optimisticBudget];
      });

      try {
        const saved = await dataService.upsertCategoryBudget(
          categoryId,
          amount,
        );
        haptics.success();
        setCategoryBudgets((prev) => {
          const filtered = prev.filter(
            (b) =>
              b.category_id !== categoryId && b.id !== optimisticBudget.id,
          );

          return [...filtered, saved];
        });
      } catch (error) {
        haptics.error();
        setCategoryBudgets(previousBudgets);
        Sentry.captureException(error, {
          tags: { operation: 'upsertCategoryBudget' },
        });
        showErrorToast('Failed to update category budget');
        throw error;
      }
    },
    [isInitialized, setCategoryBudgets, showErrorToast],
  );

  const handleCategoryBudgetDelete = useCallback(
    async (categoryId: string) => {
      if (!isInitialized) return;

      let previousBudgets: CategoryBudget[] = [];
      setCategoryBudgets((prev) => {
        previousBudgets = prev;

        return prev.filter((b) => b.category_id !== categoryId);
      });

      try {
        await dataService.deleteCategoryBudget(categoryId);
        haptics.success();
      } catch (error) {
        haptics.error();
        setCategoryBudgets(previousBudgets);
        Sentry.captureException(error, {
          tags: { operation: 'deleteCategoryBudget' },
        });
        showErrorToast('Failed to remove category budget');
        throw error;
      }
    },
    [isInitialized, setCategoryBudgets, showErrorToast],
  );

  return useMemo(
    () => ({
      handleBudgetUpdate,
      handleCategoryBudgetUpsert,
      handleCategoryBudgetDelete,
    }),
    [
      handleBudgetUpdate,
      handleCategoryBudgetUpsert,
      handleCategoryBudgetDelete,
    ],
  );
};

// --- Helpers ---

const bumpBudgetAmount = (
  budget: CategoryBudget,
  categoryId: string,
  amount: number,
): CategoryBudget => {
  if (budget.category_id !== categoryId) return budget;

  return { ...budget, monthly_amount: amount };
};
