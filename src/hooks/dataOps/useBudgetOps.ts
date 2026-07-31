import { useCallback, useMemo } from 'react';
import * as Sentry from '@/lib/sentry';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { CategoryBudget } from '@/types/CategoryBudget';
import { useShowErrorToast } from '@/hooks/dataOps/useShowErrorToast';

export const useBudgetOps = () => {
  const { isInitialized, monthlyBudget } = useDataConfig();
  const { setMonthlyBudget, setCategoryBudgets } = useDataActions();
  const { t } = useTranslation();
  const showErrorToast = useShowErrorToast();

  const handleBudgetUpdate = useCallback(
    async (amount: number) => {
      const run = async () => {
        const previousBudget = monthlyBudget;
        setMonthlyBudget(amount);

        try {
          await dataService.upsertBudget(amount);
        } catch (error) {
          haptics.error();
          setMonthlyBudget(previousBudget);
          Sentry.captureException(error, { tags: { operation: 'upsertBudget' } });
          showErrorToast(t('budget.toasts.updateFailed'), () => {
            void run().catch(() => undefined);
          });
          throw error;
        }
      };

      return run();
    },
    [monthlyBudget, setMonthlyBudget, showErrorToast, t],
  );

  const handleCategoryBudgetUpsert = useCallback(
    async (categoryId: string, amount: number) => {
      const run = async () => {
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
          showErrorToast(t('budget.toasts.categoryUpdateFailed'), () => {
            void run().catch(() => undefined);
          });
          throw error;
        }
      };

      return run();
    },
    [isInitialized, setCategoryBudgets, showErrorToast, t],
  );

  const handleCategoryBudgetDelete = useCallback(
    async (categoryId: string) => {
      const run = async () => {
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
          showErrorToast(t('budget.toasts.categoryRemoveFailed'), () => {
            void run().catch(() => undefined);
          });
          throw error;
        }
      };

      return run();
    },
    [isInitialized, setCategoryBudgets, showErrorToast, t],
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
