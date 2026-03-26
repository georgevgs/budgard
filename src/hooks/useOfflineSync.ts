import { useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { offlineQueue, type QueuedMutation } from '@/lib/offlineQueue';
import { dataService } from '@/services/dataService';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/hooks/useToast';
import type { Expense } from '@/types/Expense';

export const useOfflineSync = (): void => {
  const { t } = useTranslation();
  const { refreshExpenses } = useData();
  const isSyncing = useRef(false);

  const processMutation = useCallback(
    async (mutation: QueuedMutation): Promise<boolean> => {
      try {
        const payload = mutation.payload;

        switch (mutation.type) {
          case 'createExpense':
            await dataService.createExpense(payload as Partial<Expense>);
            break;
          case 'updateExpense':
            await dataService.updateExpense(
              payload as Partial<Expense>,
              payload.id as string,
            );
            break;
          case 'deleteExpense':
            await dataService.deleteExpense(payload.id as string);
            break;
        }

        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const syncQueue = useCallback(async () => {
    if (isSyncing.current) return;
    if (!navigator.onLine) return;

    const mutations = await offlineQueue.getAll();
    if (mutations.length === 0) return;

    isSyncing.current = true;
    let successCount = 0;
    let failCount = 0;

    for (const mutation of mutations) {
      const success = await processMutation(mutation);
      if (success) {
        await offlineQueue.remove(mutation.id);
        successCount++;
      } else {
        failCount++;
        // Stop on first failure — likely still offline or auth expired
        break;
      }
    }

    isSyncing.current = false;

    if (successCount > 0) {
      toast({
        variant: 'success',
        title: t('offline.syncSuccess', { count: successCount }),
      });
      // Refresh to get server state
      refreshExpenses().catch(() => {});
    }

    if (failCount > 0) {
      toast({
        variant: 'destructive',
        title: t('offline.syncFailed', { count: failCount }),
      });
    }
  }, [processMutation, refreshExpenses, t]);

  // Sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      syncQueue();
    };

    window.addEventListener('online', handleOnline);

    // Also try to sync on mount (in case we came back online while app was closed)
    syncQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncQueue]);
};
