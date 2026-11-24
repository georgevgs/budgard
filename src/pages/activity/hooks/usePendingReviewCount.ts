import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { dataService } from '@/common/api/dataService';
import { useExpensesData, useIncomesData } from '@/common/contexts/DataContext';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { useOnlineStatus } from '@/common/hooks/useOnlineStatus';
import type { Expense } from '@/types/Expense';

type UsePendingReviewCountReturn =
  { status: 'loading' | 'error' } | { status: 'ready'; count: number };

export const usePendingReviewCount = (): UsePendingReviewCountReturn => {
  const { pathname } = useLocation();
  const { activeOwnerId } = useFinancialSpace();
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const isOnline = useOnlineStatus();
  const isActivityVisible = '/activity' === pathname;
  const [result, setResult] = useState<UsePendingReviewCountReturn>({
    status: 'loading',
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
            setResult({ status: 'ready', count });
          }
        })
        .catch(() => {
          if (false === controller.signal.aborted) {
            setResult({ status: 'error' });
          }
        });
    }

    return () => controller.abort();
  }, [activeOwnerId, isActivityVisible, isOnline, localPendingCount]);

  return result;
};

const countPending = (transactions: Expense[]): number =>
  transactions.filter((transaction) => 'pending' === transaction.review_status)
    .length;
