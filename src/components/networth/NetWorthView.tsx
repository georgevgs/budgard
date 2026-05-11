import { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { useData } from '@/contexts/DataContext';
import { useNetWorth } from '@/hooks/useNetWorth';
import { type Account, isLiability } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import NetWorthHeader from '@/components/networth/NetWorthHeader';
import NetWorthEmpty from '@/components/networth/NetWorthEmpty';
import NetWorthLoadingState from '@/components/networth/NetWorthLoading';
import NetWorthChart from '@/components/networth/NetWorthChart';
import InvestmentAllocationCard from '@/components/networth/InvestmentAllocationCard';
import AccountGroup from '@/components/networth/AccountGroup';
import AccountForm from '@/components/networth/AccountForm';
import AccountDetailSheet from '@/components/networth/AccountDetailSheet';

const NetWorthView = () => {
  const { t } = useTranslation();
  const {
    accounts,
    accountBalances,
    defaultCurrency,
    isInitialized,
    isSecondaryLoaded,
  } = useData();
  const { summary, series } = useNetWorth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [detailAccount, setDetailAccount] = useState<Account | undefined>();

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

  const grouped = useMemo(() => {
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

  const handleAddClick = useCallback(() => {
    setSelectedAccount(undefined);
    setIsFormOpen(true);
  }, []);

  const handleAccountClick = useCallback((account: Account) => {
    setDetailAccount(account);
  }, []);

  const handleEditFromDetail = useCallback((account: Account) => {
    setDetailAccount(undefined);
    setSelectedAccount(account);
    setIsFormOpen(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setIsFormOpen(false);
    setSelectedAccount(undefined);
  }, []);

  const handleDetailClose = useCallback(() => {
    setDetailAccount(undefined);
  }, []);

  if (!isInitialized || !isSecondaryLoaded) {
    return <NetWorthLoadingState />;
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-58px)]">
      <div className="flex-1 container max-w-4xl mx-auto px-4 pt-5 pb-4 space-y-4">
        {renderBody(
          accounts.length,
          summary,
          series,
          defaultCurrency,
          grouped,
          latestSnapshotByAccount,
          handleAccountClick,
          handleAddClick,
          t,
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden"
          aria-describedby="account-form-description"
          onOpenChange={handleFormClose}
          onFocusOutside={(e) => e.preventDefault()}
        >
          <div id="account-form-description" className="sr-only">
            {t('networth.formDescription')}
          </div>
          <AccountForm account={selectedAccount} onClose={handleFormClose} />
        </DialogContent>
      </Dialog>

      {renderDetailSheet(detailAccount, handleDetailClose, handleEditFromDetail)}

      {renderFab(accounts.length, handleAddClick, t)}
    </div>
  );
}

export default NetWorthView;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

type Grouped = {
  assets: Account[];
  liabilities: Account[];
  investments: Account[];
}

import type { NetWorthSummary, NetWorthPoint } from '@/hooks/useNetWorth';

const renderBody = (
  accountCount: number,
  summary: NetWorthSummary,
  series: NetWorthPoint[],
  defaultCurrency: string,
  grouped: Grouped,
  latestSnapshotByAccount: Map<string, AccountBalance>,
  onAccountClick: (account: Account) => void,
  onAddClick: () => void,
  t: TranslateFunction,
) => {
  if (accountCount === 0) {
    return <NetWorthEmpty onAddClick={onAddClick} />;
  }

  return (
    <>
      <NetWorthHeader summary={summary} defaultCurrency={defaultCurrency} />
      <NetWorthChart series={series} defaultCurrency={defaultCurrency} />
      <AccountGroup
        title={t('networth.groups.assets')}
        accounts={grouped.assets}
        latestSnapshotByAccount={latestSnapshotByAccount}
        onAccountClick={onAccountClick}
      />
      {renderInvestmentsBlock(grouped.investments, latestSnapshotByAccount, onAccountClick, t)}
      <AccountGroup
        title={t('networth.groups.liabilities')}
        accounts={grouped.liabilities}
        latestSnapshotByAccount={latestSnapshotByAccount}
        onAccountClick={onAccountClick}
      />
    </>
  );
}

const renderInvestmentsBlock = (
  investments: Account[],
  latestSnapshotByAccount: Map<string, AccountBalance>,
  onAccountClick: (account: Account) => void,
  t: TranslateFunction,
) => {
  if (investments.length === 0) return null;

  return (
    <>
      <InvestmentAllocationCard accounts={investments} />
      <AccountGroup
        title={t('networth.groups.investments')}
        accounts={investments}
        latestSnapshotByAccount={latestSnapshotByAccount}
        onAccountClick={onAccountClick}
      />
    </>
  );
}

const renderDetailSheet = (
  account: Account | undefined,
  onClose: () => void,
  onEdit: (account: Account) => void,
) => {
  if (!account) return null;

  return (
    <AccountDetailSheet
      account={account}
      open={true}
      onClose={onClose}
      onEdit={onEdit}
    />
  );
}

const renderFab = (
  accountCount: number,
  onAddClick: () => void,
  t: TranslateFunction,
) => {
  if (accountCount === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 pb-safe-b">
      <Button
        size="icon"
        onClick={onAddClick}
        className="h-14 w-14 rounded-full shadow-lg shadow-primary/30"
        aria-label={t('networth.addAccount')}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
