import { useCallback, useMemo } from 'react';
import * as Sentry from '@/lib/sentry';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useToast';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import { offlineQueue, createTempId } from '@/lib/offlineQueue';
import { isOfflineError } from '@/lib/offlineError';
import type { Expense } from '@/types/Expense';
import { replaceById, patchById, pickByEdit } from '@/hooks/dataOps/helpers';
import { useShowErrorToast } from '@/hooks/dataOps/useShowErrorToast';

export const useIncomeOps = () => {
  const { isInitialized } = useDataConfig();
  const { setIncomes } = useDataActions();
  const { toast } = useToast();
  const { t } = useTranslation();
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
          title: pickByEdit(
            incomeId,
            t('income.toasts.updated'),
            t('income.toasts.added'),
          ),
        });

        return savedIncome;
      } catch (error) {
        if (isOfflineError(error)) {
          const mutationType = pickByEdit(
            incomeId,
            'updateIncome',
            'createIncome',
          );
          const tempId = pickByEdit<string | null>(
            incomeId,
            null,
            createTempId(),
          );
          const idPayload = pickByEdit<Record<string, unknown>>(
            incomeId,
            { id: incomeId },
            { __tempId: tempId },
          );
          await offlineQueue.enqueueWithReconcile(mutationType, {
            ...incomeData,
            ...idPayload,
          } as Record<string, unknown>);
          setIncomes((prev) => {
            if (incomeId) {
              return patchById(prev, incomeId, incomeData);
            }
            const optimistic = {
              ...incomeData,
              id: tempId as string,
              created_at: new Date().toISOString(),
            } as Expense;

            return [optimistic, ...prev];
          });
          haptics.success();
          toast({
            variant: 'success',
            title: t('offline.savedOffline'),
            description: t('offline.willSync'),
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
          pickByEdit(
            incomeId,
            t('income.toasts.updateFailed'),
            t('income.toasts.addFailed'),
          ),
        );
        throw error;
      }
    },
    [isInitialized, setIncomes, showErrorToast, toast, t],
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
        if (isOfflineError(error)) {
          await offlineQueue.enqueueWithReconcile('deleteIncome', {
            id: incomeId,
          });
          setIncomes((prev) => prev.filter((e) => e.id !== incomeId));
          haptics.success();
          toast({
            variant: 'success',
            title: t('offline.deleteSavedOffline'),
            description: t('offline.willSync'),
          });

          return;
        }
        haptics.error();
        Sentry.captureException(error, { tags: { operation: 'deleteIncome' } });
        showErrorToast(t('income.toasts.deleteFailed'));
        throw error;
      }
    },
    [isInitialized, setIncomes, showErrorToast, toast, t],
  );

  return useMemo(
    () => ({ handleIncomeSubmit, handleIncomeDelete }),
    [handleIncomeSubmit, handleIncomeDelete],
  );
};
