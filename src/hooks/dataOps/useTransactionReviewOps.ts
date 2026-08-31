import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useDataActions,
  useExpensesData,
  useIncomesData,
} from '@/contexts/DataContext';
import { useFinancialSpace } from '@/contexts/FinancialSpaceContext';
import { transactionRuleService } from '@/services/transactionRuleService';
import { useMutationRunner } from '@/hooks/dataOps/useMutationRunner';
import type { Expense } from '@/types/Expense';
import type { TransactionRuleDraft } from '@/types/TransactionRule';

export const useTransactionReviewOps = () => {
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const { setExpenses, setIncomes, refreshData } = useDataActions();
  const { activeOwnerId } = useFinancialSpace();
  const runMutation = useMutationRunner();
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const pending = useMemo(
    () => sortPending([...expenses, ...incomes]),
    [expenses, incomes],
  );

  const toggleSelected = (transactionId: string): void => {
    setSelectedIds((current) => toggleId(current, transactionId));
  };

  const selectAll = (): void => {
    setSelectedIds(new Set(pending.map((transaction) => transaction.id)));
  };

  const clearSelection = (): void => setSelectedIds(new Set());

  const markReviewed = async (ids: string[]): Promise<void> => {
    if (ids.length === 0) {
      return;
    }

    await runMutation({
      operation: 'markTransactionsReviewed',
      errorMessage: t('review.toasts.reviewFailed'),
      successMessage: t('review.toasts.reviewed', { count: ids.length }),
      optimistic: () =>
        markReviewedOptimistically(ids, setExpenses, setIncomes),
      perform: () => transactionRuleService.markReviewed(ids, activeOwnerId),
      commit: clearSelection,
    });
  };

  const teachRule = async (
    transactionId: string,
    draft: TransactionRuleDraft,
  ): Promise<boolean> => {
    try {
      await runMutation({
        operation: 'createTransactionRule',
        errorMessage: t('review.toasts.ruleFailed'),
        successMessage: t('review.toasts.ruleCreated'),
        perform: async () => {
          const rule = await transactionRuleService.createRule(
            draft,
            activeOwnerId,
          );
          await transactionRuleService.markReviewed(
            [transactionId],
            activeOwnerId,
          );

          return rule;
        },
        commit: refreshData,
      });

      return true;
    } catch {
      return false;
    }
  };

  return {
    pending,
    selectedIds,
    toggleSelected,
    selectAll,
    clearSelection,
    markReviewed,
    teachRule,
  };
};

// --- Helpers ---

type ExpenseSetter = (
  value: Expense[] | ((current: Expense[]) => Expense[]),
) => void;

const sortPending = (transactions: Expense[]): Expense[] =>
  transactions
    .filter((transaction) => transaction.review_status === 'pending')
    .sort((a, b) => b.date.localeCompare(a.date));

const toggleId = (
  current: ReadonlySet<string>,
  transactionId: string,
): ReadonlySet<string> => {
  const next = new Set(current);
  if (next.has(transactionId)) {
    next.delete(transactionId);
  } else {
    next.add(transactionId);
  }

  return next;
};

const markReviewedOptimistically = (
  ids: string[],
  setExpenses: ExpenseSetter,
  setIncomes: ExpenseSetter,
) => {
  const idSet = new Set(ids);
  let previousExpenses: Expense[] = [];
  let previousIncomes: Expense[] = [];
  const patch = (transactions: Expense[]) =>
    transactions.map((transaction) => markOneReviewed(transaction, idSet));
  setExpenses((current) => {
    previousExpenses = current;

    return patch(current);
  });
  setIncomes((current) => {
    previousIncomes = current;

    return patch(current);
  });

  return () => {
    setExpenses(previousExpenses);
    setIncomes(previousIncomes);
  };
};

const markOneReviewed = (
  transaction: Expense,
  ids: ReadonlySet<string>,
): Expense => {
  if (!ids.has(transaction.id)) {
    return transaction;
  }

  return {
    ...transaction,
    review_status: 'reviewed',
    review_reason: null,
    reviewed_at: new Date().toISOString(),
  };
};
