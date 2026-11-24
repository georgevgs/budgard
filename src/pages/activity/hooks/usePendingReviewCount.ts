import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { dataService } from '@/common/api/dataService';
import { useExpensesData, useIncomesData } from '@/common/contexts/DataContext';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { useOnlineStatus } from '@/common/hooks/useOnlineStatus';
import type { Expense } from '@/types/Expense';

type PendingCount =
  | { status: 'loading' | 'error'; ownerId: string }
  | { status: 'ready'; ownerId: string; count: number };

export const usePendingReviewCount = (): PendingCount => {
  const { pathname } = useLocation();
  const { activeOwnerId } = useFinancialSpace();
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const isOnline = useOnlineStatus();
  const isActivityVisible = '/activity' === pathname;
  const [result, setResult] = useState<PendingCount>({
    status: 'loading',
    ownerId: activeOwnerId,
  });
  const localPendingCount = useMemo(
    () => countPending(expenses) + countPending(incomes),
    [expenses, incomes],
  );

  useEffect(() => {
    const controller = new AbortController();
    if (isActivityVisible) {
      void dataService
        .getPendingReviewCount(activeOwnerId, controller.signal)
        .then((count) => {
          if (false === controller.signal.aborted) {
            setResult({ status: 'ready', ownerId: activeOwnerId, count });
          }
        })
        .catch(() => {
          if (false === controller.signal.aborted) {
            setResult({ status: 'error', ownerId: activeOwnerId });
          }
        });
    }

    return () => controller.abort();
  }, [activeOwnerId, isActivityVisible, isOnline, localPendingCount]);

  if (activeOwnerId === result.ownerId) {
    return result;
  } else {
    return { status: 'loading', ownerId: activeOwnerId };
  }
};

const countPending = (transactions: Expense[]): number =>
  transactions.filter((transaction) => 'pending' === transaction.review_status)
    .length;
