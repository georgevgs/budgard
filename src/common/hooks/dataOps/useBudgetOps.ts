import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/common/contexts/DataContext';
import { dataService } from '@/common/api/dataService';
import type { CategoryBudget } from '@/types/CategoryBudget';
import { setScalarOptimistic } from '@/common/hooks/dataOps/helpers';
import { useMutationRunner } from '@/common/hooks/dataOps/useMutationRunner';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { trackProductEvent } from '@/common/api/productEventService';

export const useBudgetOps = () => {
  const { activeOwnerId } = useFinancialSpace();
  const { isInitialized, monthlyBudget } = useDataConfig();
  const { setMonthlyBudget, setCategoryBudgets } = useDataActions();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const shouldSkip = !isInitialized;

    // The headline budget is a scalar and does not buzz — the figure changing
    // on screen is the confirmation.
    const handleBudgetUpdate = async (amount: number): Promise<void> => {
      await runMutation({
        operation: 'upsertBudget',
        errorMessage: t('budget.toasts.updateFailed'),
        successHaptic: 'none',
        optimistic: () =>
          setScalarOptimistic(setMonthlyBudget, monthlyBudget, amount),
        perform: () => dataService.upsertBudget(amount, activeOwnerId),
      });
      trackProductEvent({ name: 'monthly_budget_saved' });
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
        shouldSkip,
        errorMessage: t('budget.toasts.categoryUpdateFailed'),
        // The undo reverses only this cap, so an overlapping write to another
        // category's cap survives a failure here (see dataOps/helpers).
        optimistic: () => {
          let previousAmount: number | null = null;
          setCategoryBudgets((prev) => {
            const existing = prev.find((b) => b.category_id === categoryId);
            if (existing) {
              previousAmount = existing.monthly_amount;

              return prev.map((b) => bumpBudgetAmount(b, categoryId, amount));
            }

            return [...prev, optimisticBudget];
          });

          return () =>
            setCategoryBudgets((prev) => {
              if (previousAmount === null) {
                return prev.filter((b) => b.id !== optimisticBudget.id);
              }

              return prev.map((b) =>
                bumpBudgetAmount(b, categoryId, previousAmount as number),
              );
            });
        },
        perform: () =>
          dataService.upsertCategoryBudget(categoryId, amount, activeOwnerId),
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
        shouldSkip,
        errorMessage: t('budget.toasts.categoryRemoveFailed'),
        optimistic: () => {
          let removed: CategoryBudget | undefined;
          setCategoryBudgets((prev) => {
            removed = prev.find((b) => b.category_id === categoryId);

            return prev.filter((b) => b.category_id !== categoryId);
          });

          return () =>
            setCategoryBudgets((prev) => {
              if (!removed || prev.some((b) => b.category_id === categoryId)) {
                return prev;
              }

              return [...prev, removed];
            });
        },
        perform: () =>
          dataService.deleteCategoryBudget(categoryId, activeOwnerId),
      });

    return {
      handleBudgetUpdate,
      handleCategoryBudgetUpsert,
      handleCategoryBudgetDelete,
    };
  }, [
    activeOwnerId,
    isInitialized,
    monthlyBudget,
    setMonthlyBudget,
    setCategoryBudgets,
    runMutation,
    t,
  ]);
};

const bumpBudgetAmount = (
  budget: CategoryBudget,
  categoryId: string,
  amount: number,
): CategoryBudget => {
  if (budget.category_id !== categoryId) {
    return budget;
  }

  return { ...budget, monthly_amount: amount };
};
