import { useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { useToast } from '@/hooks/useToast';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { Debt } from '@/types/Debt';
import { pickByEdit, replaceById } from './helpers';
import { useShowErrorToast } from './useShowErrorToast';

export const useDebtOps = () => {
  const { isInitialized } = useDataConfig();
  const { setDebts } = useDataActions();
  const { toast } = useToast();
  const showErrorToast = useShowErrorToast();

  const handleDebtSubmit = useCallback(
    async (
      debtData: Partial<Debt>,
      debtId?: string,
    ): Promise<Debt | null> => {
      if (!isInitialized) return null;

      try {
        let saved: Debt;
        if (debtId) {
          saved = await dataService.updateDebt(debtId, debtData);
        } else {
          saved = await dataService.createDebt(debtData);
        }

        haptics.success();
        setDebts((prev) => {
          if (debtId) return replaceById(prev, debtId, saved);

          return [...prev, saved];
        });

        toast({
          variant: 'success',
          title: pickByEdit(debtId, 'Debt updated', 'Debt added'),
        });

        return saved;
      } catch (error) {
        haptics.error();
        Sentry.captureException(error, {
          tags: { operation: pickByEdit(debtId, 'updateDebt', 'createDebt') },
        });
        showErrorToast(
          `Failed to ${pickByEdit(debtId, 'update', 'add')} debt`,
        );
        throw error;
      }
    },
    [isInitialized, setDebts, showErrorToast, toast],
  );

  const handleDebtArchive = useCallback(
    async (debtId: string) => {
      if (!isInitialized) return;

      haptics.warning();
      let previousDebts: Debt[] = [];
      setDebts((prev) => {
        previousDebts = prev;

        return prev.filter((d) => d.id !== debtId);
      });

      try {
        await dataService.archiveDebt(debtId);
        haptics.success();
      } catch (error) {
        haptics.error();
        setDebts(previousDebts);
        Sentry.captureException(error, {
          tags: { operation: 'archiveDebt' },
        });
        showErrorToast('Failed to archive debt');
        throw error;
      }
    },
    [isInitialized, setDebts, showErrorToast],
  );

  return useMemo(
    () => ({ handleDebtSubmit, handleDebtArchive }),
    [handleDebtSubmit, handleDebtArchive],
  );
};
