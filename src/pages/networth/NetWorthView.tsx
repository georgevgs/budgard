import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/common/ui/button';
import { Dialog, DialogContent } from '@/common/ui/dialog';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { useDataConfig } from '@/common/contexts/DataContext';
import { useProGate } from '@/common/hooks/useProGate';
import { useNetWorth } from '@/common/hooks/useNetWorth';
import type { TranslateFunction } from '@/constants/translate';
import {
  useGroupedAccounts,
  type GroupedAccounts,
} from '@/pages/networth/hooks/useGroupedAccounts';
import { type Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import { PageHeader } from '@/common/components/common/PageHeader';
import { OnDemandData } from '@/common/components/onDemandData/OnDemandData';
import { NetWorthHeader } from '@/pages/networth/components/NetWorthHeader';
import { NetWorthEmpty } from '@/pages/networth/components/NetWorthEmpty';
import { NetWorthLoading } from '@/pages/networth/components/NetWorthLoading';
import { useDelayedLoading } from '@/common/hooks/useDelayedLoading';
import { NetWorthChart } from '@/pages/networth/components/NetWorthChart';
import { InvestmentAllocationCard } from '@/pages/networth/components/InvestmentAllocationCard';
import { AccountGroup } from '@/pages/networth/components/AccountGroup';
import { AccountForm } from '@/pages/networth/components/AccountForm';
import { AccountDetailSheet } from '@/pages/networth/components/AccountDetailSheet';
import { ProUpsellCard } from '@/common/components/pro/ProUpsellCard';
import type {
  NetWorthSummary,
  NetWorthPoint,
} from '@/common/hooks/useNetWorth';

const NetWorthView = () => {
  const { t } = useTranslation();
  const { accounts, grouped, latestSnapshotByAccount } = useGroupedAccounts();
  const { defaultCurrency, isInitialized, isSecondaryLoaded } = useDataConfig();
  const { summary, series } = useNetWorth();
  const { isPro, allow } = useProGate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [detailAccount, setDetailAccount] = useState<Account | undefined>();

  // The free tier tracks up to 3 active accounts; `accounts` is active-only
  // (getAccounts filters archived), so its length is the count that matters.
  const handleAddClick = useCallback(() => {
    if (!allow('accounts', accounts.length)) {
      return;
    }

    setSelectedAccount(undefined);
    setIsFormOpen(true);
  }, [allow, accounts.length]);

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

  const isLoading = !isInitialized || !isSecondaryLoaded;
  const showSkeleton = useDelayedLoading(isLoading);

  if (isLoading) {
    return renderLoading(showSkeleton);
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-var(--header-height)-env(safe-area-inset-top)-var(--dock-inset))]">
      <div className="page-shell flex-1 space-y-4">
        <PageHeader title={t('navigation.networth')} />
        <OnDemandData domain="accountBalances">
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
            isPro,
          )}
        </OnDemandData>
      </div>

      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent
          className="gap-0 p-0 sm:max-w-[500px]"
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

      {renderDetailSheet(
        detailAccount,
        handleDetailClose,
        handleEditFromDetail,
      )}

      {renderFab(accounts.length, handleAddClick, t)}
    </div>
  );
};

export default NetWorthView;

const renderLoading = (showSkeleton: boolean) => {
  if (!showSkeleton) {
    return null;
  }

  return <NetWorthLoading />;
};

const renderBody = (
  accountCount: number,
  summary: NetWorthSummary,
  series: NetWorthPoint[],
  defaultCurrency: string,
  grouped: GroupedAccounts,
  latestSnapshotByAccount: Map<string, AccountBalance>,
  onAccountClick: (account: Account) => void,
  onAddClick: () => void,
  t: TranslateFunction,
  isPro: boolean,
) => {
  if (accountCount === 0) {
    return <NetWorthEmpty onAddClick={onAddClick} />;
  }

  return (
    <>
      <NetWorthHeader summary={summary} defaultCurrency={defaultCurrency} />
      <NetWorthChart
        series={series}
        defaultCurrency={defaultCurrency}
        hasDebtConstant={summary.debts > 0}
      />
      <AccountGroup
        title={t('networth.groups.assets')}
        accounts={grouped.assets}
        latestSnapshotByAccount={latestSnapshotByAccount}
        onAccountClick={onAccountClick}
      />
      {renderInvestmentsBlock(
        grouped.investments,
        latestSnapshotByAccount,
        onAccountClick,
        t,
        isPro,
      )}
      <AccountGroup
        title={t('networth.groups.liabilities')}
        accounts={grouped.liabilities}
        latestSnapshotByAccount={latestSnapshotByAccount}
        onAccountClick={onAccountClick}
      />
    </>
  );
};

const renderInvestmentsBlock = (
  investments: Account[],
  latestSnapshotByAccount: Map<string, AccountBalance>,
  onAccountClick: (account: Account) => void,
  t: TranslateFunction,
  isPro: boolean,
) => {
  if (investments.length === 0) {
    return null;
  }

  return (
    <>
      {renderAllocationCard(investments, isPro, t)}
      <AccountGroup
        title={t('networth.groups.investments')}
        accounts={investments}
        latestSnapshotByAccount={latestSnapshotByAccount}
        onAccountClick={onAccountClick}
      />
    </>
  );
};

// Allocation analytics are Pro depth; the investment account list itself
// stays free.
const renderAllocationCard = (
  investments: Account[],
  isPro: boolean,
  t: TranslateFunction,
) => {
  if (!isPro) {
    return (
      <ProUpsellCard
        title={t('pro.gate.investTitle')}
        description={t('pro.gate.investBody')}
      />
    );
  }

  return <InvestmentAllocationCard accounts={investments} />;
};

const renderDetailSheet = (
  account: Account | undefined,
  onClose: () => void,
  onEdit: (account: Account) => void,
) => {
  if (!account) {
    return null;
  }

  return (
    <AccountDetailSheet
      account={account}
      open={true}
      onClose={onClose}
      onEdit={onEdit}
    />
  );
};

const renderFab = (
  accountCount: number,
  onAddClick: () => void,
  t: TranslateFunction,
) => {
  if (accountCount === 0) {
    return null;
  }

  return (
    <div
      data-dock-action
      className="fixed bottom-(--dock-bottom) right-(--dock-edge) z-50"
    >
      <Button
        size="icon"
        onClick={onAddClick}
        className="lift h-14 w-14 rounded-full"
        aria-label={t('networth.addAccount')}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};
