import { useMemo } from 'react';
import { captureException } from '@/config/sentry';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/common/contexts/DataContext';
import { dataService } from '@/common/api/dataService';
import { haptics } from '@/constants/haptics';
import type { RecurringExpense } from '@/types/RecurringExpense';
import {
  patchById,
  pickByEdit,
  removeOptimistic,
  replaceById,
} from '@/common/hooks/dataOps/helpers';
import { useMutationRunner } from '@/common/hooks/dataOps/useMutationRunner';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';

export const useRecurringIncomeOps = () => {
  const { activeOwnerId } = useFinancialSpace();
  const { isInitialized } = useDataConfig();
  const { setRecurringIncomes, refreshIncomes } = useDataActions();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const shouldSkip = !isInitialized;

    const handleRecurringIncomeSubmit = (
      incomeData: Partial<RecurringExpense>,
      incomeId?: string,
    ) =>
      runMutation({
        operation: pickByEdit(
          incomeId,
          'updateRecurringIncome',
          'createRecurringIncome',
        ),
        shouldSkip,
        errorMessage: pickByEdit(
          incomeId,
          t('recurring.toasts.incomeUpdateFailed'),
          t('recurring.toasts.incomeAddFailed'),
        ),
        successMessage: pickByEdit(
          incomeId,
          t('recurring.toasts.incomeUpdated'),
          t('recurring.toasts.incomeAdded'),
        ),
        perform: () => {
          if (incomeId) {
            return dataService.updateRecurringIncome(incomeData, incomeId);
          }

          return dataService.createRecurringIncome(incomeData, activeOwnerId);
        },
        commit: (saved) =>
          setRecurringIncomes((prev) => {
            if (incomeId) {
              return replaceById(prev, incomeId, saved);
            }

            return [saved, ...prev];
          }),
      });

    const handleRecurringIncomeDelete = (incomeId: string) =>
      runMutation({
        operation: 'deleteRecurringIncome',
        shouldSkip,
        errorMessage: t('recurring.toasts.incomeDeleteFailed'),
        onStart: () => haptics.warning(),
        optimistic: () => removeOptimistic(setRecurringIncomes, incomeId),
        perform: () => dataService.deleteRecurringIncome(incomeId),
        // Deleting the rule can strip generated rows, so the ledger is resynced.
        commit: () => {
          refreshIncomes().catch((err) => {
            captureException(err, {
              tags: {
                operation: 'refreshIncomes',
                context: 'afterRecurringIncomeDelete',
              },
            });
          });
        },
      });

    const handleRecurringIncomeToggle = (incomeId: string, active: boolean) =>
      runMutation({
        operation: 'toggleRecurringIncome',
        shouldSkip,
        errorMessage: t('recurring.toasts.incomeToggleFailed'),
        optimistic: () => {
          setRecurringIncomes((prev) => patchById(prev, incomeId, { active }));

          // Flip it back rather than restoring the whole list: the switch is
          // the only thing that moved.
          return () =>
            setRecurringIncomes((prev) =>
              patchById(prev, incomeId, { active: !active }),
            );
        },
        perform: () => dataService.toggleRecurringIncome(incomeId, active),
        commit: (saved) =>
          setRecurringIncomes((prev) => replaceById(prev, incomeId, saved)),
      });

    return {
      handleRecurringIncomeSubmit,
      handleRecurringIncomeDelete,
      handleRecurringIncomeToggle,
    };
  }, [
    activeOwnerId,
    isInitialized,
    setRecurringIncomes,
    refreshIncomes,
    runMutation,
    t,
  ]);
};
