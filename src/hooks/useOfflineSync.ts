import { useEffect, useCallback, useRef } from 'react';
import * as Sentry from '@/lib/sentry';
import { useTranslation } from 'react-i18next';
import { offlineQueue, type QueuedMutation } from '@/lib/offlineQueue';
import { dataService } from '@/services/dataService';
import { useDataActions } from '@/contexts/DataContext';
import { toast } from '@/hooks/useToast';
import { isOfflineError } from '@/lib/offlineError';
import type { Expense } from '@/types/Expense';

// A permanently-failing mutation (validation, RLS, unknown type) is retried a
// few times to ride out a misclassified blip, then dropped so it can't block
// the rest of the queue forever.
const MAX_RETRIES = 5;

export const useOfflineSync = (): void => {
  const { t } = useTranslation();
  const { refreshExpenses, refreshIncomes } = useDataActions();
  const isSyncing = useRef(false);

  const syncQueue = useCallback(async () => {
    if (isSyncing.current) return;
    if (!navigator.onLine) return;

    const mutations = await offlineQueue.getAll();
    if (mutations.length === 0) return;

    isSyncing.current = true;
    let successCount = 0;
    let failCount = 0;

    // Process in id order; stop the pass on the first failure so dependent
    // mutations can't run out of order.
    for (const mutation of mutations) {
      try {
        await applyMutation(mutation);
        await offlineQueue.remove(mutation.id);
        successCount++;
      } catch (error) {
        // Still offline / server still unreachable — keep the change untouched
        // and retry on the next trigger. Don't count it against the retry cap.
        if (isOfflineError(error)) {
          break;
        }

        // Permanent failure: count a retry, and drop it once it's clearly poison.
        const retries = (mutation.retries ?? 0) + 1;
        Sentry.captureException(error, {
          tags: { operation: 'offlineSync', mutationType: mutation.type },
          extra: { retries },
        });

        if (retries >= MAX_RETRIES) {
          await offlineQueue.remove(mutation.id);
        } else {
          await offlineQueue.update(mutation.id, { retries });
        }
        failCount++;
        break;
      }
    }

    isSyncing.current = false;

    if (successCount > 0) {
      toast({
        variant: 'success',
        title: t('offline.syncSuccess', { count: successCount }),
      });
      // Refresh to get server state (real ids replace optimistic temp rows).
      refreshExpenses().catch((err) => {
        Sentry.captureException(err, {
          tags: { operation: 'refreshExpenses', context: 'afterOfflineSync' },
        });
      });
      refreshIncomes().catch((err) => {
        Sentry.captureException(err, {
          tags: { operation: 'refreshIncomes', context: 'afterOfflineSync' },
        });
      });
    }

    if (failCount > 0) {
      toast({
        variant: 'destructive',
        title: t('offline.syncFailed', { count: failCount }),
      });
    }
  }, [refreshExpenses, refreshIncomes, t]);

  // Drain the queue when connectivity returns, when the app is foregrounded
  // (covers a server that recovered while the app sat in the background, where
  // no 'online' event fires), and once on mount.
  useEffect(() => {
    const handleOnline = (): void => {
      syncQueue();
    };

    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        syncQueue();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    syncQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [syncQueue]);
};

// --- Helpers ---

const applyMutation = async (mutation: QueuedMutation): Promise<void> => {
  // __tempId is local-only metadata used to coalesce offline create+edit/delete
  // chains; the server doesn't know about it.
  const { __tempId: _tempId, ...payload } = mutation.payload as Record<
    string,
    unknown
  >;

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
    case 'createIncome':
      await dataService.createIncome(payload as Partial<Expense>);
      break;
    case 'updateIncome':
      await dataService.updateIncome(
        payload as Partial<Expense>,
        payload.id as string,
      );
      break;
    case 'deleteIncome':
      await dataService.deleteIncome(payload.id as string);
      break;
    default: {
      // Exhaustiveness guard: a stale entry of an unknown type must fail loudly
      // (then be retried/dropped), never be silently treated as synced.
      const unknownType: never = mutation.type;
      throw new Error(`Unknown offline mutation type: ${String(unknownType)}`);
    }
  }
};
