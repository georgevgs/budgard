import { useEffect, useState } from 'react';
import * as Sentry from '@/lib/sentry';
import { dataService } from '@/services/dataService';
import type { Expense } from '@/types/Expense';

type UseDebtPaymentsResult = {
  payments: Expense[];
  isLoading: boolean;
  hasError: boolean;
  retry: () => void;
  removePayment: (paymentId: string) => void;
};

// Loads payment history for a debt while the detail sheet is open.
// Re-fetches when the debt's updated_at changes (DB trigger updates it
// after each payment write).
export const useDebtPayments = (
  debtId: string,
  isActive: boolean,
  updatedAt: string,
): UseDebtPaymentsResult => {
  const [payments, setPayments] = useState<Expense[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [settled, setSettled] = useState<{
    key: string;
    failed: boolean;
  } | null>(null);

  const requestKey = `${debtId}|${updatedAt}|${retryCount}`;

  // Closing the sheet invalidates what we settled on, so the next open
  // starts from the skeleton again instead of flashing stale rows.
  if (!isActive && settled !== null) {
    setSettled(null);
  }

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const key = `${debtId}|${updatedAt}|${retryCount}`;
    let cancelled = false;

    (async () => {
      try {
        const data = await dataService.getDebtPayments(debtId);
        if (cancelled) {
          return;
        }
        setPayments(data);
        setSettled({ key, failed: false });
      } catch (error) {
        Sentry.captureException(error, {
          tags: { context: 'useDebtPayments.load' },
        });
        if (!cancelled) {
          setSettled({ key, failed: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debtId, updatedAt, isActive, retryCount]);

  const isLoading = settled === null || settled.key !== requestKey;
  const hasError =
    settled !== null && settled.key === requestKey && settled.failed;

  const retry = () => {
    setRetryCount((count) => count + 1);
  };

  const removePayment = (paymentId: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
  };

  return { payments, isLoading, hasError, retry, removePayment };
};
