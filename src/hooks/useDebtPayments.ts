import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/react';
import { dataService } from '@/services/dataService';
import type { Expense } from '@/types/Expense';

type UseDebtPaymentsResult = {
  payments: Expense[];
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const data = await dataService.getDebtPayments(debtId);
        if (cancelled) {
          return;
        }
        setPayments(data);
      } catch (error) {
        Sentry.captureException(error, {
          tags: { context: 'useDebtPayments.load' },
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debtId, updatedAt, isActive]);

  const removePayment = (paymentId: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
  };

  return { payments, isLoading, removePayment };
};
