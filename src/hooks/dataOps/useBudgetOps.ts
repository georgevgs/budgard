import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import type { CategoryBudget } from '@/types/CategoryBudget';
import { setScalarOptimistic } from '@/hooks/dataOps/helpers';
import { useMutationRunner } from '@/hooks/dataOps/useMutationRunner';

export const useBudgetOps = () => {
  const { isInitialized, monthlyBudget } = useDataConfig();
  const { setMonthlyBudget, setCategoryBudgets } = useDataActions();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const skip = !isInitialized;

    // The headline budget is a scalar and does not buzz — the figure changing
    // on screen is the confirmation.
    const handleBudgetUpdate = async (amount: number): Promise<void> => {
      await runMutation({
        operation: 'upsertBudget',
        errorMessage: t('budget.toasts.updateFailed'),
        successHaptic: 'none',
        optimistic: () =>
          setScalarOptimistic(setMonthlyBudget, monthlyBudget, amount),
        perform: () => dataService.upsertBudget(amount),
      });
    };

    // Upsert, so the optimistic pass either bumps the existing cap or adds a
    // placeholder row — and the commit collapses both onto the saved row.
    const handleCategoryBudgetUpsert = (categoryId: string, amount: number) => {
      const optimisticBudget: CategoryBudget = {
        id: `temp-${Date.now()}`,
        user_id: '',
        category_id: categoryId,
        monthly_amount: amount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return runMutation({
        operation: 'upsertCategoryBudget',
        skip,
        errorMessage: t('budget.toasts.categoryUpdateFailed'),
        optimistic: () => {
          let previousBudgets: CategoryBudget[] = [];
          setCategoryBudgets((prev) => {
            previousBudgets = prev;
            const existing = prev.find((b) => b.category_id === categoryId);
            if (existing) {
              return prev.map((b) => bumpBudgetAmount(b, categoryId, amount));
            }

            return [...prev, optimisticBudget];
          });

          return () => setCategoryBudgets(previousBudgets);
        },
        perform: () => dataService.upsertCategoryBudget(categoryId, amount),
        commit: (saved) =>
          setCategoryBudgets((prev) => [
            ...prev.filter(
              (b) =>
                b.category_id !== categoryId && b.id !== optimisticBudget.id,
            ),
            saved,
          ]),
      });
    };

    const handleCategoryBudgetDelete = (categoryId: string) =>
      runMutation({
        operation: 'deleteCategoryBudget',
        skip,
        errorMessage: t('budget.toasts.categoryRemoveFailed'),
        optimistic: () => {
          let previousBudgets: CategoryBudget[] = [];
          setCategoryBudgets((prev) => {
            previousBudgets = prev;

            return prev.filter((b) => b.category_id !== categoryId);
          });

          return () => setCategoryBudgets(previousBudgets);
        },
        perform: () => dataService.deleteCategoryBudget(categoryId),
      });

    return {
      handleBudgetUpdate,
      handleCategoryBudgetUpsert,
      handleCategoryBudgetDelete,
    };
  }, [
    isInitialized,
    monthlyBudget,
    setMonthlyBudget,
    setCategoryBudgets,
    runMutation,
    t,
  ]);
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
