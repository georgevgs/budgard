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

export const useRecurringExpenseOps = () => {
  const { activeOwnerId } = useFinancialSpace();
  const { isInitialized } = useDataConfig();
  const { setRecurringExpenses, refreshExpenses } = useDataActions();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const shouldSkip = !isInitialized;

    const handleRecurringExpenseSubmit = (
      expenseData: Partial<RecurringExpense>,
      expenseId?: string,
    ) =>
      runMutation({
        operation: pickByEdit(
          expenseId,
          'updateRecurringExpense',
          'createRecurringExpense',
        ),
        shouldSkip,
        errorMessage: pickByEdit(
          expenseId,
          t('recurring.toasts.expenseUpdateFailed'),
          t('recurring.toasts.expenseAddFailed'),
        ),
        successMessage: pickByEdit(
          expenseId,
          t('recurring.toasts.expenseUpdated'),
          t('recurring.toasts.expenseAdded'),
        ),
        perform: () => {
          if (expenseId) {
            return dataService.updateRecurringExpense(expenseData, expenseId);
          }

          return dataService.createRecurringExpense(expenseData, activeOwnerId);
        },
        commit: (saved) =>
          setRecurringExpenses((prev) => {
            if (expenseId) return replaceById(prev, expenseId, saved);

            return [saved, ...prev];
          }),
      });

    const handleRecurringExpenseDelete = (expenseId: string) =>
      runMutation({
        operation: 'deleteRecurringExpense',
        shouldSkip,
        errorMessage: t('recurring.toasts.expenseDeleteFailed'),
        onStart: () => haptics.warning(),
        optimistic: () => removeOptimistic(setRecurringExpenses, expenseId),
        perform: () => dataService.deleteRecurringExpense(expenseId),
        // Deleting the rule can strip generated rows, so the ledger is resynced.
        commit: () => {
          refreshExpenses().catch((err) => {
            captureException(err, {
              tags: {
                operation: 'refreshExpenses',
                context: 'afterRecurringExpenseDelete',
              },
            });
          });
        },
      });

    const handleRecurringExpenseToggle = (expenseId: string, active: boolean) =>
      runMutation({
        operation: 'toggleRecurringExpense',
        shouldSkip,
        errorMessage: t('recurring.toasts.expenseToggleFailed'),
        optimistic: () => {
          setRecurringExpenses((prev) =>
            patchById(prev, expenseId, { active }),
          );

          // Flip it back rather than restoring the whole list: the switch is
          // the only thing that moved.
          return () =>
            setRecurringExpenses((prev) =>
              patchById(prev, expenseId, { active: !active }),
            );
        },
        perform: () => dataService.toggleRecurringExpense(expenseId, active),
        commit: (saved) =>
          setRecurringExpenses((prev) => replaceById(prev, expenseId, saved)),
      });

    return {
      handleRecurringExpenseSubmit,
      handleRecurringExpenseDelete,
      handleRecurringExpenseToggle,
    };
  }, [
    activeOwnerId,
    isInitialized,
    setRecurringExpenses,
    refreshExpenses,
    runMutation,
    t,
  ]);
};
