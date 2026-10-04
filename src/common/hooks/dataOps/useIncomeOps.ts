import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/common/hooks/useToast';
import { useDataActions, useDataConfig } from '@/common/contexts/DataContext';
import { dataService } from '@/common/api/dataService';
import { haptics } from '@/constants/haptics';
import { offlineQueue, createClientId } from '@/constants/offlineQueue';
import { isOfflineError } from '@/constants/offlineError';
import type { TranslateFunction } from '@/constants/translate';
import type { Expense } from '@/types/Expense';
import {
  replaceById,
  patchById,
  pickByEdit,
  reconcileImportedRows,
} from '@/common/hooks/dataOps/helpers';
import { mergeUniqueById } from '@/common/contexts/dataContextHelpers';
import { useMutationRunner } from '@/common/hooks/dataOps/useMutationRunner';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';

type BulkIncomeRow = {
  date: string;
  description: string;
  amount: number;
  category_id: string | null;
};

export const useIncomeOps = () => {
  const { activeOwnerId } = useFinancialSpace();
  const { isInitialized } = useDataConfig();
  const { setIncomes, refreshIncomes } = useDataActions();
  const { toast } = useToast();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const shouldSkip = !isInitialized;

    const queueOffline = (
      incomeData: Partial<Expense>,
      incomeId: string | undefined,
      error: unknown,
    ): Promise<boolean> =>
      queueIncomeOffline(incomeData, incomeId, error, {
        ownerId: activeOwnerId,
        setIncomes,
        toast,
        t,
      });

    // Server-first: an income row carries server-derived columns, so it is
    // shown only once the write lands (or once it is safely queued).
    const handleIncomeSubmit = async (
      incomeData: Partial<Expense>,
      incomeId?: string,
    ): Promise<Expense | null> => {
      // Chosen once per submit, so a retry, an offline replay or a request
      // that outlived its timeout all name the same row — see withClientId.
      const writeData = withClientId(incomeData, incomeId);
      const saved = await runMutation<Expense>({
        operation: pickByEdit(incomeId, 'updateIncome', 'createIncome'),
        shouldSkip,
        errorMessage: pickByEdit(
          incomeId,
          t('income.toasts.updateFailed'),
          t('income.toasts.addFailed'),
        ),
        successMessage: pickByEdit(
          incomeId,
          t('income.toasts.updated'),
          t('income.toasts.added'),
        ),
        offlineFallback: (error) => queueOffline(writeData, incomeId, error),
        perform: () => {
          if (incomeId) {
            return dataService.updateIncome(writeData, incomeId);
          }

          return dataService.createIncome(writeData, activeOwnerId);
        },
        commit: (row) =>
          setIncomes((prev) => {
            if (incomeId) {
              return replaceById(prev, incomeId, row);
            }

            return [row, ...prev];
          }),
      });

      return saved ?? null;
    };

    // The row is removed once the delete lands, not before — a failed delete
    // that already emptied the row would read as data loss.
    const handleIncomeDelete = (incomeId: string) =>
      runMutation({
        operation: 'deleteIncome',
        shouldSkip,
        errorMessage: t('income.toasts.deleteFailed'),
        onStart: () => haptics.warning(),
        successHaptic: 'none',
        offlineFallback: async (error) => {
          if (!isOfflineError(error)) {
            return false;
          }

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

          return true;
        },
        perform: () => dataService.deleteIncome(incomeId),
        commit: () =>
          setIncomes((prev) => prev.filter((e) => e.id !== incomeId)),
      });

    // The insert returns the created rows with their embeds, so merging them
    // into state replaces a full-history re-download.
    const handleBulkIncomeImport = async (incomesData: BulkIncomeRow[]) => {
      await runMutation({
        operation: 'importIncomes',
        shouldSkip,
        errorMessage: t('import.importError'),
        // The import flow owns retries because one half may already be saved.
        isRetryable: false,
        perform: async () => {
          const created = await dataService.createIncomesBulk(
            incomesData,
            activeOwnerId,
          );
          setIncomes((prev) => mergeUniqueById(prev, created));
          await reconcileImportedRows(activeOwnerId, refreshIncomes);
        },
      });
    };

    return { handleIncomeSubmit, handleIncomeDelete, handleBulkIncomeImport };
  }, [
    activeOwnerId,
    isInitialized,
    setIncomes,
    refreshIncomes,
    runMutation,
    toast,
    t,
  ]);
};

type OfflineDeps = {
  ownerId: string;
  setIncomes: (updater: (prev: Expense[]) => Expense[]) => void;
  toast: ReturnType<typeof useToast>['toast'];
  t: TranslateFunction;
};

// Queues the write and applies it locally, so the row looks saved while the
// device is offline. Returns true to tell the runner it is handled.
const queueIncomeOffline = async (
  incomeData: Partial<Expense>,
  incomeId: string | undefined,
  error: unknown,
  { ownerId, setIncomes, toast, t }: OfflineDeps,
): Promise<boolean> => {
  if (!isOfflineError(error)) {
    return false;
  }

  const scopedIncome = { ...incomeData, user_id: ownerId };
  await offlineQueue.enqueueWithReconcile(
    pickByEdit(incomeId, 'updateIncome', 'createIncome'),
    {
      ...scopedIncome,
      ...pickByEdit<Record<string, unknown>>(
        incomeId,
        { id: incomeId },
        { __tempId: incomeData.id },
      ),
    } as Record<string, unknown>,
  );

  setIncomes((prev) => {
    if (incomeId) {
      return patchById(prev, incomeId, scopedIncome);
    }

    const optimistic = {
      ...scopedIncome,
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

  return true;
};

// A new income gets its id on the device rather than from the database
// default, so every attempt at writing it names the same row.
const withClientId = (
  incomeData: Partial<Expense>,
  incomeId: string | undefined,
): Partial<Expense> => {
  if (incomeId) {
    return incomeData;
  }

  return { ...incomeData, id: createClientId() };
};
