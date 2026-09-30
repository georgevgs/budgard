import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useDataActions,
  useExpensesData,
  useIncomesData,
} from '@/common/contexts/DataContext';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { transactionRuleService } from '@/common/api/transactionRuleService';
import { useMutationRunner } from '@/common/hooks/dataOps/useMutationRunner';
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

// The undo puts back the review fields of these rows only, inside updaters, so
// an expense added or edited while the write was in flight survives a failure
// here — restoring a snapshot of both lists used to undo it too.
const markReviewedOptimistically = (
  ids: string[],
  setExpenses: ExpenseSetter,
  setIncomes: ExpenseSetter,
) => {
  const idSet = new Set(ids);
  const previous = new Map<string, ReviewFields>();
  const patch = (transactions: Expense[]) =>
    transactions.map((transaction) => {
      if (idSet.has(transaction.id)) {
        previous.set(transaction.id, pickReviewFields(transaction));
      }

      return markOneReviewed(transaction, idSet);
    });
  const restore = (transactions: Expense[]) =>
    transactions.map((transaction) => {
      const fields = previous.get(transaction.id);
      if (!fields) {
        return transaction;
      }

      return { ...transaction, ...fields };
    });
  setExpenses(patch);
  setIncomes(patch);

  return () => {
    setExpenses(restore);
    setIncomes(restore);
  };
};

type ReviewFields = Pick<
  Expense,
  'review_status' | 'review_reason' | 'reviewed_at'
>;

const pickReviewFields = (transaction: Expense): ReviewFields => ({
  review_status: transaction.review_status,
  review_reason: transaction.review_reason,
  reviewed_at: transaction.reviewed_at,
});

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
