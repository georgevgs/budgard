import { useMemo } from 'react';
import { useAccountsData } from '@/contexts/DataContext';
import { type Account, isLiability } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';

export type GroupedAccounts = {
  assets: Account[];
  liabilities: Account[];
  investments: Account[];
};

export const useGroupedAccounts = () => {
  const { accounts, accountBalances } = useAccountsData();

  const latestSnapshotByAccount = useMemo(() => {
    const map = new Map<string, AccountBalance>();
    accountBalances.forEach((b) => {
      const existing = map.get(b.account_id);
      if (!existing || b.recorded_at > existing.recorded_at) {
        map.set(b.account_id, b);
      }
    });

    return map;
  }, [accountBalances]);

  const grouped = useMemo<GroupedAccounts>(() => {
    const assets: Account[] = [];
    const liabilities: Account[] = [];
    const investments: Account[] = [];

    accounts.forEach((a) => {
      if (a.kind === 'investment') {
        investments.push(a);

        return;
      }
      if (isLiability(a.kind)) {
        liabilities.push(a);

        return;
      }
      assets.push(a);
    });

    return { assets, liabilities, investments };
  }, [accounts]);

  return { accounts, grouped, latestSnapshotByAccount };
};
