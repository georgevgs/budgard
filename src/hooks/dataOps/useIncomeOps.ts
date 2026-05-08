import { useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { useToast } from '@/hooks/useToast';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import { offlineQueue } from '@/lib/offlineQueue';
import type { Expense } from '@/types/Expense';
import { replaceById, patchById, pickByEdit } from './helpers';
import { useShowErrorToast } from './useShowErrorToast';

export const useIncomeOps = () => {
  const { isInitialized } = useDataConfig();
  const { setIncomes } = useDataActions();
  const { toast } = useToast();
  const showErrorToast = useShowErrorToast();

  const handleIncomeSubmit = useCallback(
    async (
      incomeData: Partial<Expense>,
      incomeId?: string,
    ): Promise<Expense | null> => {
      if (!isInitialized) {
        return null;
      }

      try {
        let savedIncome: Expense;
        if (incomeId) {
          savedIncome = await dataService.updateIncome(incomeData, incomeId);
        } else {
          savedIncome = await dataService.createIncome(incomeData);
        }

        haptics.success();
        setIncomes((prev) => {
          if (incomeId) return replaceById(prev, incomeId, savedIncome);

          return [savedIncome, ...prev];
        });
        toast({
          variant: 'success',
          title: pickByEdit(incomeId, 'Income updated', 'Income added'),
        });

        return savedIncome;
      } catch (error) {
        if (!navigator.onLine) {
          const mutationType = pickByEdit(
            incomeId,
            'updateIncome',
            'createIncome',
          );
          const idPayload = pickByEdit<Record<string, unknown>>(
            incomeId,
            { id: incomeId },
            {},
          );
          await offlineQueue.enqueue(mutationType, {
            ...incomeData,
            ...idPayload,
          } as Record<string, unknown>);
          setIncomes((prev) => {
            if (incomeId) {
              return patchById(prev, incomeId, incomeData);
            }
            const optimistic = {
              ...incomeData,
              id: `temp-${Date.now()}`,
              created_at: new Date().toISOString(),
            } as Expense;

            return [optimistic, ...prev];
          });
          haptics.success();
          toast({
            variant: 'success',
            title: 'Income queued',
            description: 'Will sync when back online',
          });

          return null;
        }
        haptics.error();
        Sentry.captureException(error, {
          tags: {
            operation: pickByEdit(incomeId, 'updateIncome', 'createIncome'),
          },
        });
        showErrorToast(
          `Failed to ${pickByEdit(incomeId, 'update', 'add')} income`,
        );
        throw error;
      }
    },
    [isInitialized, setIncomes, showErrorToast, toast],
  );

  const handleIncomeDelete = useCallback(
    async (incomeId: string) => {
      if (!isInitialized) {
        return;
      }

      haptics.warning();
      try {
        await dataService.deleteIncome(incomeId);
        setIncomes((prev) => prev.filter((e) => e.id !== incomeId));
      } catch (error) {
        if (!navigator.onLine) {
          await offlineQueue.enqueue('deleteIncome', { id: incomeId });
          setIncomes((prev) => prev.filter((e) => e.id !== incomeId));
          haptics.success();
          toast({
            variant: 'success',
            title: 'Delete queued',
            description: 'Will sync when back online',
          });

          return;
        }
        haptics.error();
        Sentry.captureException(error, { tags: { operation: 'deleteIncome' } });
        showErrorToast('Failed to delete income');
        throw error;
      }
    },
    [isInitialized, setIncomes, showErrorToast, toast],
  );

  return useMemo(
    () => ({ handleIncomeSubmit, handleIncomeDelete }),
    [handleIncomeSubmit, handleIncomeDelete],
  );
};
