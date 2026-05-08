import { useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { useToast } from '@/hooks/useToast';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { RecurringExpense } from '@/types/RecurringExpense';
import { patchById, pickByEdit, replaceById } from './helpers';
import { useShowErrorToast } from './useShowErrorToast';

export const useRecurringExpenseOps = () => {
  const { isInitialized } = useDataConfig();
  const { setRecurringExpenses, refreshExpenses } = useDataActions();
  const { toast } = useToast();
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
            'Recurring expense updated',
            'Recurring expense added',
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
          `Failed to ${pickByEdit(expenseId, 'update', 'add')} recurring expense`,
        );
        throw error;
      }
    },
    [isInitialized, setRecurringExpenses, showErrorToast, toast],
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
        showErrorToast('Failed to delete recurring expense');
        throw error;
      }
    },
    [isInitialized, setRecurringExpenses, refreshExpenses, showErrorToast],
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
        showErrorToast('Failed to update recurring expense status');
        throw error;
      }
    },
    [isInitialized, setRecurringExpenses, showErrorToast],
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
