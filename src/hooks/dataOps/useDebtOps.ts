import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { Debt } from '@/types/Debt';
import {
  pickByEdit,
  removeOptimistic,
  replaceById,
} from '@/hooks/dataOps/helpers';
import { useMutationRunner } from '@/hooks/dataOps/useMutationRunner';
import { useFinancialSpace } from '@/contexts/FinancialSpaceContext';

export const useDebtOps = () => {
  const { activeOwnerId } = useFinancialSpace();
  const { isInitialized } = useDataConfig();
  const { setDebts } = useDataActions();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const skip = !isInitialized;

    // Server-first: a debt carries a balance the DB maintains, so there is
    // nothing safe to show optimistically. New debts append rather than
    // prepend — the list reads oldest-first.
    const handleDebtSubmit = async (
      debtData: Partial<Debt>,
      debtId?: string,
    ): Promise<Debt | null> => {
      const saved = await runMutation<Debt>({
        operation: pickByEdit(debtId, 'updateDebt', 'createDebt'),
        skip,
        errorMessage: pickByEdit(
          debtId,
          t('debts.toasts.updateFailed'),
          t('debts.toasts.addFailed'),
        ),
        successMessage: pickByEdit(
          debtId,
          t('debts.toasts.updated'),
          t('debts.toasts.added'),
        ),
        perform: () => {
          if (debtId) return dataService.updateDebt(debtId, debtData);

          return dataService.createDebt(debtData, activeOwnerId);
        },
        commit: (row) =>
          setDebts((prev) => {
            if (debtId) return replaceById(prev, debtId, row);

            return [...prev, row];
          }),
      });

      return saved ?? null;
    };

    const handleDebtArchive = (debtId: string) =>
      runMutation({
        operation: 'archiveDebt',
        skip,
        errorMessage: t('debts.toasts.archiveFailed'),
        onStart: () => haptics.warning(),
        optimistic: () => removeOptimistic(setDebts, debtId),
        perform: () => dataService.archiveDebt(debtId),
      });

    return { handleDebtSubmit, handleDebtArchive };
  }, [activeOwnerId, isInitialized, setDebts, runMutation, t]);
};
