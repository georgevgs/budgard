import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAccountBalances } from '@/hooks/useAccountBalances';
import { useAccountDetailActions } from '@/hooks/networth/useAccountDetailActions';
import { useDateLocale } from '@/hooks/useDateLocale';
import { type Account } from '@/types/Account';
import { type SnapshotMode } from '@/components/networth/BalanceSnapshotForm';
import AccountDetailHeader from '@/components/networth/AccountDetailHeader';
import AccountHistoryChart from '@/components/networth/AccountHistoryChart';
import ConfirmDestructiveDialog from '@/components/common/ConfirmDestructiveDialog';
import {
  renderActionBar,
  renderSnapshotForm,
  renderHistoryList,
} from '@/components/networth/AccountDetailSheet.helpers';

type Props = {
  account: Account;
  open: boolean;
  onClose: () => void;
  onEdit: (account: Account) => void;
};

const AccountDetailSheet = ({ account, open, onClose, onEdit }: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { snapshots, isLoading, hasError, retry, removeSnapshot } =
    useAccountBalances(account.id, open, account.updated_at);
  const [snapshotMode, setSnapshotMode] = useState<SnapshotMode | null>(null);
  const actions = useAccountDetailActions({ account, onClose, removeSnapshot });

  const isInvestment = account.kind === 'investment';

  const handleOpenChange = createOpenChangeHandler(
    () => setSnapshotMode(null),
    onClose,
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-[500px]"
          onOpenChange={handleOpenChange}
        >
          {renderDetailView(
            snapshotMode,
            <>
              <div
                className="flex justify-center pb-2 pt-3 sm:hidden"
                data-drag-handle
              >
                <div className="h-1.5 w-12 rounded-full bg-muted-foreground/20" />
              </div>

              <AccountDetailHeader
                account={account}
                snapshots={snapshots}
                onEdit={onEdit}
                onArchiveRequest={() => actions.setShowArchiveDialog(true)}
              />

              <div
                className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4"
                style={{ touchAction: 'pan-y' }}
              >
                <AccountHistoryChart account={account} snapshots={snapshots} />

                {renderActionBar(isInvestment, setSnapshotMode, t)}

                <div className="flex items-center justify-between gap-2 pb-2 pt-4">
                  <h3 className="text-sm font-medium">
                    {t('networth.detail.history')}
                  </h3>
                </div>

                {renderHistoryList({
                  isLoading,
                  hasError,
                  isInvestment,
                  snapshots,
                  currency: account.default_currency,
                  accountName: account.name,
                  dateLocale,
                  onDelete: (id) => actions.setSnapshotToDelete(id),
                  onRetry: retry,
                  setMode: setSnapshotMode,
                  t,
                })}
              </div>
            </>,
          )}

          {renderSnapshotForm(account, snapshotMode, () =>
            setSnapshotMode(null),
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDestructiveDialog
        open={actions.showArchiveDialog}
        title={t('networth.archiveTitle')}
        description={t('networth.archiveConfirmation', { name: account.name })}
        confirmLabel={t('networth.archive')}
        onOpenChange={actions.setShowArchiveDialog}
        onConfirm={actions.handleArchiveConfirm}
      />

      <ConfirmDestructiveDialog
        open={Boolean(actions.snapshotToDelete)}
        title={t('networth.detail.deleteSnapshotTitle')}
        description={t('networth.detail.deleteSnapshotDescription')}
        confirmLabel={t('common.delete')}
        onOpenChange={(isOpen) => {
          if (!isOpen) actions.setSnapshotToDelete(null);
        }}
        onConfirm={actions.handleSnapshotDeleteConfirm}
      />
    </>
  );
};

export default AccountDetailSheet;

// --- Helpers ---

const createOpenChangeHandler = (reset: () => void, onClose: () => void) => {
  return (nextOpen: boolean) => {
    if (nextOpen) {
      return;
    }

    reset();
    onClose();
  };
};

const renderDetailView = (mode: SnapshotMode | null, children: ReactNode) => {
  if (mode !== null) {
    return null;
  }

  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
};
