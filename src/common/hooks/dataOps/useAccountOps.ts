import { useMemo } from 'react';
import { captureException } from '@/config/sentry';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/common/contexts/DataContext';
import { dataService } from '@/common/api/dataService';
import { haptics } from '@/constants/haptics';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import {
  pickByEdit,
  removeOptimistic,
  replaceById,
} from '@/common/hooks/dataOps/helpers';
import { useMutationRunner } from '@/common/hooks/dataOps/useMutationRunner';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';

export const useAccountOps = () => {
  const { activeOwnerId } = useFinancialSpace();
  const { isInitialized } = useDataConfig();
  const { setAccounts, setAccountBalances, refreshAccounts } = useDataActions();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const shouldSkip = !isInitialized;

    // Server-first: an account's balance is derived, so there is nothing safe
    // to show before the write lands. New accounts append — the list reads
    // in creation order.
    const handleAccountSubmit = async (
      accountData: Partial<Account> & { initial_balance?: number },
      accountId?: string,
    ): Promise<Account | null> => {
      const saved = await runMutation<Account>({
        operation: pickByEdit(accountId, 'updateAccount', 'createAccount'),
        shouldSkip,
        errorMessage: pickByEdit(
          accountId,
          t('networth.toasts.accountUpdateFailed'),
          t('networth.toasts.accountAddFailed'),
        ),
        successMessage: pickByEdit(
          accountId,
          t('networth.toasts.accountUpdated'),
          t('networth.toasts.accountAdded'),
        ),
        perform: () => {
          if (accountId)
            return dataService.updateAccount(accountId, accountData);

          return dataService.createAccount(accountData, activeOwnerId);
        },
        commit: (row) => {
          setAccounts((prev) => {
            if (accountId) return replaceById(prev, accountId, row);

            return [...prev, row];
          });

          // A new account may arrive with an opening balance the server
          // derived; refetch so the list shows it.
          if (!accountId) {
            refreshAccounts().catch((err) => {
              captureException(err, {
                tags: { context: 'afterAccountCreate' },
              });
            });
          }
        },
      });

      return saved ?? null;
    };

    const handleAccountArchive = (accountId: string) =>
      runMutation({
        operation: 'archiveAccount',
        shouldSkip,
        errorMessage: t('networth.toasts.archiveFailed'),
        onStart: () => haptics.warning(),
        optimistic: () => removeOptimistic(setAccounts, accountId),
        perform: () => dataService.archiveAccount(accountId),
      });

    // A snapshot rewrites the account's balance, so the account row is
    // refetched rather than patched — the server owns that number.
    const handleSnapshotCreate = (snapshot: Partial<AccountBalance>) =>
      runMutation({
        operation: 'createAccountBalance',
        shouldSkip,
        errorMessage: t('networth.toasts.balanceUpdateFailed'),
        successMessage: t('networth.toasts.balanceUpdated'),
        perform: () => dataService.upsertAccountBalance(snapshot),
        commit: async (saved) => {
          const account = await dataService.getAccountById(saved.account_id);

          setAccountBalances((prev) =>
            [
              ...prev.filter(
                (b) =>
                  !(
                    b.account_id === saved.account_id &&
                    b.recorded_at === saved.recorded_at
                  ),
              ),
              saved,
            ].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)),
          );
          setAccounts((prev) => replaceById(prev, saved.account_id, account));
        },
      });

    const handleSnapshotDelete = (snapshotId: string, accountId: string) =>
      runMutation({
        operation: 'deleteAccountBalance',
        shouldSkip,
        errorMessage: t('networth.toasts.snapshotDeleteFailed'),
        onStart: () => haptics.warning(),
        optimistic: () => removeOptimistic(setAccountBalances, snapshotId),
        perform: async () => {
          await dataService.deleteAccountBalance(snapshotId);

          return dataService.getAccountById(accountId);
        },
        commit: (account) =>
          setAccounts((prev) => replaceById(prev, accountId, account)),
      });

    return {
      handleAccountSubmit,
      handleAccountArchive,
      handleSnapshotCreate,
      handleSnapshotDelete,
    };
  }, [
    activeOwnerId,
    isInitialized,
    setAccounts,
    setAccountBalances,
    refreshAccounts,
    runMutation,
    t,
  ]);
};
