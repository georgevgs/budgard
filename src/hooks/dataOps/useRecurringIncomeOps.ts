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

export const useRecurringIncomeOps = () => {
  const { isInitialized } = useDataConfig();
  const { setRecurringIncomes, refreshIncomes } = useDataActions();
  const { toast } = useToast();
  const { t } = useTranslation();
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
            t('recurring.toasts.incomeUpdated'),
            t('recurring.toasts.incomeAdded'),
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
          pickByEdit(
            incomeId,
            t('recurring.toasts.incomeUpdateFailed'),
            t('recurring.toasts.incomeAddFailed'),
          ),
          () => {
            void handleRecurringIncomeSubmit(incomeData, incomeId).catch(() => undefined);
          },
        );
        throw error;
      }
    },
    [isInitialized, setRecurringIncomes, showErrorToast, toast, t],
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
        showErrorToast(t('recurring.toasts.incomeDeleteFailed'), () => {
          void handleRecurringIncomeDelete(incomeId).catch(() => undefined);
        });
        throw error;
      }
    },
    [isInitialized, setRecurringIncomes, refreshIncomes, showErrorToast, t],
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
        showErrorToast(t('recurring.toasts.incomeToggleFailed'), () => {
          void handleRecurringIncomeToggle(incomeId, active).catch(() => undefined);
        });
        throw error;
      }
    },
    [isInitialized, setRecurringIncomes, showErrorToast, t],
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
