import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { useDataConfig } from '@/contexts/DataContext';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';
import { useIsPro } from '@/hooks/useIsPro';
import { toast } from '@/hooks/useToast';
import { canAddAccount, FREE_ACCOUNT_LIMIT } from '@/lib/proLimits';
import { useNetWorth } from '@/hooks/useNetWorth';
import {
  useGroupedAccounts,
  type GroupedAccounts,
} from '@/hooks/networth/useGroupedAccounts';
import { type Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import NetWorthHeader from '@/components/networth/NetWorthHeader';
import NetWorthEmpty from '@/components/networth/NetWorthEmpty';
import NetWorthLoadingState from '@/components/networth/NetWorthLoading';
import NetWorthChart from '@/components/networth/NetWorthChart';
import InvestmentAllocationCard from '@/components/networth/InvestmentAllocationCard';
import AccountGroup from '@/components/networth/AccountGroup';
import AccountForm from '@/components/networth/AccountForm';
import AccountDetailSheet from '@/components/networth/AccountDetailSheet';
import ProUpsellCard from '@/components/pro/ProUpsellCard';

const NetWorthView = () => {
  const { t } = useTranslation();
  const { accounts, grouped, latestSnapshotByAccount } = useGroupedAccounts();
  const { defaultCurrency, isInitialized, isSecondaryLoaded } = useDataConfig();
  const { summary, series } = useNetWorth();
  const isPro = useIsPro();
  const { openUpgrade } = useUpgradeDialog();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [detailAccount, setDetailAccount] = useState<Account | undefined>();

  // The free tier tracks up to 3 active accounts; `accounts` is active-only
  // (getAccounts filters archived), so its length is the count that matters.
  const handleAddClick = useCallback(() => {
    if (!canAddAccount(isPro, accounts.length)) {
      toast({
        title: t('pro.gate.accountLimit', { limit: FREE_ACCOUNT_LIMIT }),
      });
      openUpgrade();

      return;
    }

    setSelectedAccount(undefined);
    setIsFormOpen(true);
  }, [isPro, accounts.length, openUpgrade, t]);

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
    <div className="flex flex-col min-h-[calc(100dvh-4rem-env(safe-area-inset-top))] pb-20">
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
          isPro,
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

import type { NetWorthSummary, NetWorthPoint } from '@/hooks/useNetWorth';

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
      <NetWorthChart series={series} defaultCurrency={defaultCurrency} />
      <AccountGroup
        title={t('networth.groups.assets')}
        accounts={grouped.assets}
        latestSnapshotByAccount={latestSnapshotByAccount}
        onAccountClick={onAccountClick}
      />
      {renderInvestmentsBlock(grouped.investments, latestSnapshotByAccount, onAccountClick, t, isPro)}
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
  isPro: boolean,
) => {
  if (investments.length === 0) return null;

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
}

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
