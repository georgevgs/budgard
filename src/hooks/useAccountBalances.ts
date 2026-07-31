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
  const [retryCount, setRetryCount] = useState(0);
  const [settled, setSettled] = useState<{
    key: string;
    failed: boolean;
  } | null>(null);

  const requestKey = `${accountId}|${updatedAt}|${retryCount}`;

  // Closing the sheet invalidates what we settled on, so the next open
  // starts from the skeleton again instead of flashing stale rows.
  if (!isActive && settled !== null) {
    setSettled(null);
  }

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const key = `${accountId}|${updatedAt}|${retryCount}`;
    let cancelled = false;

    (async () => {
      try {
        const data = await dataService.getAccountBalances(accountId);
        if (cancelled) {
          return;
        }
        setSnapshots(data);
        setSettled({ key, failed: false });
      } catch (error) {
        Sentry.captureException(error, {
          tags: { context: 'useAccountBalances.load' },
        });
        if (!cancelled) {
          setSettled({ key, failed: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountId, updatedAt, isActive, retryCount]);

  const isLoading = settled === null || settled.key !== requestKey;
  const hasError =
    settled !== null && settled.key === requestKey && settled.failed;

  const retry = () => {
    setRetryCount((count) => count + 1);
  };

  const removeSnapshot = (snapshotId: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
  };

  return { snapshots, isLoading, hasError, retry, removeSnapshot };
};
