import { useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { useToast } from '@/hooks/useToast';
import { useDataActions, useDataConfig } from '@/contexts/DataContext';
import { dataService } from '@/services/dataService';
import { haptics } from '@/lib/haptics';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import { pickByEdit, replaceById } from './helpers';
import { useShowErrorToast } from './useShowErrorToast';

export const useAccountOps = () => {
  const { isInitialized } = useDataConfig();
  const { setAccounts, setAccountBalances, refreshAccounts } = useDataActions();
  const { toast } = useToast();
  const showErrorToast = useShowErrorToast();

  const handleAccountSubmit = useCallback(
    async (
      accountData: Partial<Account> & { initial_balance?: number },
      accountId?: string,
    ): Promise<Account | null> => {
      if (!isInitialized) return null;

      try {
        let saved: Account;
        if (accountId) {
          saved = await dataService.updateAccount(accountId, accountData);
        } else {
          saved = await dataService.createAccount(accountData);
        }

        haptics.success();
        setAccounts((prev) => {
          if (accountId) return replaceById(prev, accountId, saved);

          return [...prev, saved];
        });

        if (!accountId) {
          refreshAccounts().catch((err) => {
            Sentry.captureException(err, {
              tags: { context: 'afterAccountCreate' },
            });
          });
        }

        toast({
          variant: 'success',
          title: pickByEdit(accountId, 'Account updated', 'Account added'),
        });

        return saved;
      } catch (error) {
        haptics.error();
        Sentry.captureException(error, {
          tags: {
            operation: pickByEdit(accountId, 'updateAccount', 'createAccount'),
          },
        });
        showErrorToast(
          `Failed to ${pickByEdit(accountId, 'update', 'add')} account`,
        );
        throw error;
      }
    },
    [isInitialized, setAccounts, refreshAccounts, showErrorToast, toast],
  );

  const handleAccountArchive = useCallback(
    async (accountId: string) => {
      if (!isInitialized) return;

      haptics.warning();
      let previousAccounts: Account[] = [];
      setAccounts((prev) => {
        previousAccounts = prev;

        return prev.filter((a) => a.id !== accountId);
      });

      try {
        await dataService.archiveAccount(accountId);
        haptics.success();
      } catch (error) {
        haptics.error();
        setAccounts(previousAccounts);
        Sentry.captureException(error, {
          tags: { operation: 'archiveAccount' },
        });
        showErrorToast('Failed to archive account');
        throw error;
      }
    },
    [isInitialized, setAccounts, showErrorToast],
  );

  const handleSnapshotCreate = useCallback(
    async (snapshot: Partial<AccountBalance>) => {
      if (!isInitialized) return null;

      try {
        const saved = await dataService.upsertAccountBalance(snapshot);
        haptics.success();

        const accountId = saved.account_id;
        const updatedAccount = await dataService.getAccountById(accountId);

        setAccountBalances((prev) => {
          const filtered = prev.filter(
            (b) =>
              !(b.account_id === accountId && b.recorded_at === saved.recorded_at),
          );
          return [...filtered, saved].sort((a, b) =>
            a.recorded_at.localeCompare(b.recorded_at),
          );
        });
        setAccounts((prev) => replaceById(prev, accountId, updatedAccount));

        toast({ variant: 'success', title: 'Balance updated' });
        return saved;
      } catch (error) {
        haptics.error();
        Sentry.captureException(error, {
          tags: { operation: 'createAccountBalance' },
        });
        showErrorToast('Failed to update balance');
        throw error;
      }
    },
    [isInitialized, setAccounts, setAccountBalances, showErrorToast, toast],
  );

  const handleSnapshotDelete = useCallback(
    async (snapshotId: string, accountId: string) => {
      if (!isInitialized) return;

      haptics.warning();
      let previousBalances: AccountBalance[] = [];
      setAccountBalances((prev) => {
        previousBalances = prev;

        return prev.filter((b) => b.id !== snapshotId);
      });

      try {
        await dataService.deleteAccountBalance(snapshotId);
        const updatedAccount = await dataService.getAccountById(accountId);
        setAccounts((prev) => replaceById(prev, accountId, updatedAccount));
        haptics.success();
      } catch (error) {
        haptics.error();
        setAccountBalances(previousBalances);
        Sentry.captureException(error, {
          tags: { operation: 'deleteAccountBalance' },
        });
        showErrorToast('Failed to delete snapshot');
        throw error;
      }
    },
    [isInitialized, setAccounts, setAccountBalances, showErrorToast],
  );

  return useMemo(
    () => ({
      handleAccountSubmit,
      handleAccountArchive,
      handleSnapshotCreate,
      handleSnapshotDelete,
    }),
    [
      handleAccountSubmit,
      handleAccountArchive,
      handleSnapshotCreate,
      handleSnapshotDelete,
    ],
  );
};
