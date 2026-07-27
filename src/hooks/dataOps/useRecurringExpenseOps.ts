import { useCallback, useMemo } from 'react';
import * as Sentry from '@/lib/sentry';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useToast';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { RecurringExpense } from '@/types/RecurringExpense';
import { patchById, pickByEdit, replaceById } from '@/hooks/dataOps/helpers';
import { useShowErrorToast } from '@/hooks/dataOps/useShowErrorToast';

export const useRecurringExpenseOps = () => {
  const { isInitialized } = useDataConfig();
  const { setRecurringExpenses, refreshExpenses } = useDataActions();
  const { toast } = useToast();
  const { t } = useTranslation();
  const showErrorToast = useShowErrorToast();

  const handleRecurringExpenseSubmit = useCallback(
    async (expenseData: Partial<RecurringExpense>, expenseId?: string) => {
      if (!isInitialized) {
        return;
      }

      try {
        let savedExpense: RecurringExpense;
        if (expenseId) {
          savedExpense = await dataService.updateRecurringExpense(
            expenseData,
            expenseId,
          );
        } else {
          savedExpense = await dataService.createRecurringExpense(expenseData);
        }

        haptics.success();
        toast({
          variant: 'success',
          title: pickByEdit(
            expenseId,
            t('recurring.toasts.expenseUpdated'),
            t('recurring.toasts.expenseAdded'),
          ),
        });
        setRecurringExpenses((prev) => {
          if (expenseId) return replaceById(prev, expenseId, savedExpense);

          return [savedExpense, ...prev];
        });
      } catch (error) {
        haptics.error();
        Sentry.captureException(error, {
          tags: {
            operation: pickByEdit(
              expenseId,
              'updateRecurringExpense',
              'createRecurringExpense',
            ),
          },
        });
        showErrorToast(
          pickByEdit(
            expenseId,
            t('recurring.toasts.expenseUpdateFailed'),
            t('recurring.toasts.expenseAddFailed'),
          ),
        );
        throw error;
      }
    },
    [isInitialized, setRecurringExpenses, showErrorToast, toast, t],
  );

  const handleRecurringExpenseDelete = useCallback(
    async (expenseId: string) => {
      if (!isInitialized) {
        return;
      }

      haptics.warning();

      let previousRecurring: RecurringExpense[] = [];
      setRecurringExpenses((prev) => {
        previousRecurring = prev;

        return prev.filter((e) => e.id !== expenseId);
      });

      try {
        await dataService.deleteRecurringExpense(expenseId);
        haptics.success();
        refreshExpenses().catch((err) => {
          Sentry.captureException(err, {
            tags: {
              operation: 'refreshExpenses',
              context: 'afterRecurringExpenseDelete',
            },
          });
        });
      } catch (error) {
        haptics.error();
        setRecurringExpenses(previousRecurring);
        Sentry.captureException(error, {
          tags: { operation: 'deleteRecurringExpense' },
        });
        showErrorToast(t('recurring.toasts.expenseDeleteFailed'));
        throw error;
      }
    },
    [isInitialized, setRecurringExpenses, refreshExpenses, showErrorToast, t],
  );

  const handleRecurringExpenseToggle = useCallback(
    async (expenseId: string, active: boolean) => {
      if (!isInitialized) {
        return;
      }

      setRecurringExpenses((prev) => patchById(prev, expenseId, { active }));

      try {
        const savedExpense = await dataService.toggleRecurringExpense(
          expenseId,
          active,
        );
        haptics.success();
        setRecurringExpenses((prev) => replaceById(prev, expenseId, savedExpense));
      } catch (error) {
        haptics.error();
        setRecurringExpenses((prev) =>
          patchById(prev, expenseId, { active: !active }),
        );
        Sentry.captureException(error, {
          tags: { operation: 'toggleRecurringExpense' },
        });
        showErrorToast(t('recurring.toasts.expenseToggleFailed'));
        throw error;
      }
    },
    [isInitialized, setRecurringExpenses, showErrorToast, t],
  );

  return useMemo(
    () => ({
      handleRecurringExpenseSubmit,
      handleRecurringExpenseDelete,
      handleRecurringExpenseToggle,
    }),
    [
      handleRecurringExpenseSubmit,
      handleRecurringExpenseDelete,
      handleRecurringExpenseToggle,
    ],
  );
};
