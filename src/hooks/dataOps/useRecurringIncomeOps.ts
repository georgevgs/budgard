import { useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { useToast } from '@/hooks/useToast';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { RecurringExpense } from '@/types/RecurringExpense';
import { patchById, pickByEdit, replaceById } from './helpers';
import { useShowErrorToast } from './useShowErrorToast';

export const useRecurringIncomeOps = () => {
  const { isInitialized } = useDataConfig();
  const { setRecurringIncomes, refreshIncomes } = useDataActions();
  const { toast } = useToast();
  const showErrorToast = useShowErrorToast();

  const handleRecurringIncomeSubmit = useCallback(
    async (incomeData: Partial<RecurringExpense>, incomeId?: string) => {
      if (!isInitialized) {
        return;
      }

      try {
        let saved: RecurringExpense;
        if (incomeId) {
          saved = await dataService.updateRecurringIncome(incomeData, incomeId);
        } else {
          saved = await dataService.createRecurringIncome(incomeData);
        }

        haptics.success();
        toast({
          variant: 'success',
          title: pickByEdit(
            incomeId,
            'Recurring income updated',
            'Recurring income added',
          ),
        });
        setRecurringIncomes((prev) => {
          if (incomeId) return replaceById(prev, incomeId, saved);

          return [saved, ...prev];
        });
      } catch (error) {
        haptics.error();
        Sentry.captureException(error, {
          tags: {
            operation: pickByEdit(
              incomeId,
              'updateRecurringIncome',
              'createRecurringIncome',
            ),
          },
        });
        showErrorToast(
          `Failed to ${pickByEdit(incomeId, 'update', 'add')} recurring income`,
        );
        throw error;
      }
    },
    [isInitialized, setRecurringIncomes, showErrorToast, toast],
  );

  const handleRecurringIncomeDelete = useCallback(
    async (incomeId: string) => {
      if (!isInitialized) {
        return;
      }

      haptics.warning();

      let previousRecurring: RecurringExpense[] = [];
      setRecurringIncomes((prev) => {
        previousRecurring = prev;

        return prev.filter((e) => e.id !== incomeId);
      });

      try {
        await dataService.deleteRecurringIncome(incomeId);
        haptics.success();
        refreshIncomes().catch((err) => {
          Sentry.captureException(err, {
            tags: {
              operation: 'refreshIncomes',
              context: 'afterRecurringIncomeDelete',
            },
          });
        });
      } catch (error) {
        haptics.error();
        setRecurringIncomes(previousRecurring);
        Sentry.captureException(error, {
          tags: { operation: 'deleteRecurringIncome' },
        });
        showErrorToast('Failed to delete recurring income');
        throw error;
      }
    },
    [isInitialized, setRecurringIncomes, refreshIncomes, showErrorToast],
  );

  const handleRecurringIncomeToggle = useCallback(
    async (incomeId: string, active: boolean) => {
      if (!isInitialized) {
        return;
      }

      setRecurringIncomes((prev) => patchById(prev, incomeId, { active }));

      try {
        const saved = await dataService.toggleRecurringIncome(incomeId, active);
        haptics.success();
        setRecurringIncomes((prev) => replaceById(prev, incomeId, saved));
      } catch (error) {
        haptics.error();
        setRecurringIncomes((prev) =>
          patchById(prev, incomeId, { active: !active }),
        );
        Sentry.captureException(error, {
          tags: { operation: 'toggleRecurringIncome' },
        });
        showErrorToast('Failed to update recurring income status');
        throw error;
      }
    },
    [isInitialized, setRecurringIncomes, showErrorToast],
  );

  return useMemo(
    () => ({
      handleRecurringIncomeSubmit,
      handleRecurringIncomeDelete,
      handleRecurringIncomeToggle,
    }),
    [
      handleRecurringIncomeSubmit,
      handleRecurringIncomeDelete,
      handleRecurringIncomeToggle,
    ],
  );
};
