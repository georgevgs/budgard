import { useMemo } from 'react';
import * as Sentry from '@/lib/sentry';
import { useTranslation } from 'react-i18next';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import {
  pickByEdit,
  removeOptimistic,
  replaceById,
} from '@/hooks/dataOps/helpers';
import { useMutationRunner } from '@/hooks/dataOps/useMutationRunner';
import { useFinancialSpace } from '@/contexts/FinancialSpaceContext';

export const useAccountOps = () => {
  const { activeOwnerId } = useFinancialSpace();
  const { isInitialized } = useDataConfig();
  const { setAccounts, setAccountBalances, refreshAccounts } = useDataActions();
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  return useMemo(() => {
    const skip = !isInitialized;

    // Server-first: an account's balance is derived, so there is nothing safe
    // to show before the write lands. New accounts append — the list reads
    // in creation order.
    const handleAccountSubmit = async (
      accountData: Partial<Account> & { initial_balance?: number },
      accountId?: string,
    ): Promise<Account | null> => {
      const saved = await runMutation<Account>({
        operation: pickByEdit(accountId, 'updateAccount', 'createAccount'),
        skip,
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
          if (accountId) return dataService.updateAccount(accountId, accountData);

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
              Sentry.captureException(err, {
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
        skip,
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
        skip,
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
        skip,
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
