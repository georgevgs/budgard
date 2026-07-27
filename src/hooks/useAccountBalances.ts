import { useEffect, useState } from 'react';
import * as Sentry from '@/lib/sentry';
import { dataService } from '@/services/dataService';
import type { AccountBalance } from '@/types/AccountBalance';

type UseAccountBalancesResult = {
  snapshots: AccountBalance[];
  isLoading: boolean;
  hasError: boolean;
  retry: () => void;
  removeSnapshot: (snapshotId: string) => void;
};

// Loads balance snapshots for an account while the detail sheet is open.
// Re-fetches when the account's updated_at changes (DB trigger updates it
// whenever a new snapshot is recorded).
export const useAccountBalances = (
  accountId: string,
  isActive: boolean,
  updatedAt: string,
): UseAccountBalancesResult => {
  const [snapshots, setSnapshots] = useState<AccountBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    (async () => {
      try {
        const data = await dataService.getAccountBalances(accountId);
        if (cancelled) {
          return;
        }
        setSnapshots(data);
      } catch (error) {
        Sentry.captureException(error, {
          tags: { context: 'useAccountBalances.load' },
        });
        if (!cancelled) {
          setHasError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountId, updatedAt, isActive, retryCount]);

  const retry = () => {
    setRetryCount((count) => count + 1);
  };

  const removeSnapshot = (snapshotId: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
  };

  return { snapshots, isLoading, hasError, retry, removeSnapshot };
};
