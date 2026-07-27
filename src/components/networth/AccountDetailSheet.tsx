import { useState } from 'react';
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
}

const AccountDetailSheet = ({ account, open, onClose, onEdit }: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { snapshots, isLoading, hasError, retry, removeSnapshot } =
    useAccountBalances(account.id, open, account.updated_at);
  const [snapshotMode, setSnapshotMode] = useState<SnapshotMode | null>(null);
  const actions = useAccountDetailActions({ account, onClose, removeSnapshot });

  const isInvestment = account.kind === 'investment';

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden sm:[&>button]:inline-flex flex flex-col max-h-[85dvh]"
          aria-describedby="account-detail-description"
          onOpenChange={onClose}
        >
          <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
            <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
          </div>

          <AccountDetailHeader
            account={account}
            snapshots={snapshots}
            onEdit={onEdit}
            onArchiveRequest={() => actions.setShowArchiveDialog(true)}
          />

          <div
            className="overflow-y-auto flex-1 px-4 pb-4 overscroll-contain"
            style={{ touchAction: 'pan-y' }}
            id="account-detail-description"
          >
            <AccountHistoryChart account={account} snapshots={snapshots} />

            {renderActionBar(isInvestment, setSnapshotMode, t)}

            <div className="flex items-center justify-between pt-4 pb-2 gap-2">
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
        </DialogContent>
      </Dialog>

      <Dialog
        open={snapshotMode !== null}
        onOpenChange={() => setSnapshotMode(null)}
      >
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden sm:[&>button]:inline-flex"
          onOpenChange={() => setSnapshotMode(null)}
          onFocusOutside={(e) => e.preventDefault()}
        >
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
}

export default AccountDetailSheet;
