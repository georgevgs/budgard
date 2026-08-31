import { useMemo } from 'react';
import * as Sentry from '@/lib/sentry';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { RecurringExpense } from '@/types/RecurringExpense';
import {
  patchById,
  pickByEdit,
  removeOptimistic,
  replaceById,
} from '@/hooks/dataOps/helpers';
import { useMutationRunner } from '@/hooks/dataOps/useMutationRunner';
import { useFinancialSpace } from '@/contexts/FinancialSpaceContext';

export const useRecurringIncomeOps = () => {
  const { activeOwnerId } = useFinancialSpace();
  const { isInitialized } = useDataConfig();
  const { setRecurringIncomes, refreshIncomes } = useDataActions();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const skip = !isInitialized;

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
        skip,
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
            if (incomeId) return replaceById(prev, incomeId, saved);

            return [saved, ...prev];
          }),
      });

    const handleRecurringIncomeDelete = (incomeId: string) =>
      runMutation({
        operation: 'deleteRecurringIncome',
        skip,
        errorMessage: t('recurring.toasts.incomeDeleteFailed'),
        onStart: () => haptics.warning(),
        optimistic: () => removeOptimistic(setRecurringIncomes, incomeId),
        perform: () => dataService.deleteRecurringIncome(incomeId),
        // Deleting the rule can strip generated rows, so the ledger is resynced.
        commit: () => {
          refreshIncomes().catch((err) => {
            Sentry.captureException(err, {
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
        skip,
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
  }, [activeOwnerId, isInitialized, setRecurringIncomes, refreshIncomes, runMutation, t]);
};
