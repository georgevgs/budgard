import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import { cn, formatCurrency } from '@/lib/utils';
import { useAccountOps } from '@/hooks/dataOps/useAccountOps';
import { useAccountBalances } from '@/hooks/useAccountBalances';
import { useDateLocale } from '@/hooks/useDateLocale';
import { type Account, isLiability } from '@/types/Account';
import { type SnapshotMode } from '@/components/networth/BalanceSnapshotForm';
import AccountHistoryChart from '@/components/networth/AccountHistoryChart';
import {
  renderActionBar,
  renderSinceLast,
  renderSnapshotForm,
  renderInvestmentDetail,
  renderHistoryList,
  getBalanceClass,
  renderLiabilitySign,
} from './AccountDetailSheet.helpers';

type Props = {
  account: Account;
  open: boolean;
  onClose: () => void;
  onEdit: (account: Account) => void;
}

const AccountDetailSheet = ({ account, open, onClose, onEdit }: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { handleAccountArchive, handleSnapshotDelete } = useAccountOps();
  const { snapshots, isLoading, removeSnapshot } = useAccountBalances(
    account.id,
    open,
    account.updated_at,
  );
  const [snapshotMode, setSnapshotMode] = useState<SnapshotMode | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [snapshotToDelete, setSnapshotToDelete] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const liability = isLiability(account.kind);
  const isInvestment = account.kind === 'investment';

  const handleArchiveClick = () => {
    setMenuOpen(false);
    setTimeout(() => setShowArchiveDialog(true), 0);
  };

  const handleArchiveConfirm = async () => {
    setShowArchiveDialog(false);
    try {
      await handleAccountArchive(account.id);
      onClose();
    } catch {
      // toast already shown
    }
  };

  const handleEditClick = () => {
    setMenuOpen(false);
    setTimeout(() => onEdit(account), 0);
  };

  const handleSnapshotDeleteConfirm = async () => {
    if (!snapshotToDelete) {
      return;
    }

    const id = snapshotToDelete;
    setSnapshotToDelete(null);
    try {
      await handleSnapshotDelete(id, account.id);
      removeSnapshot(id);
    } catch {
      // toast already shown
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden flex flex-col max-h-[85vh]"
          aria-describedby="account-detail-description"
          onOpenChange={onClose}
        >
          <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
            <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
          </div>

          <DialogHeader className="p-4 pb-2" data-draggable-area>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl truncate">
                  {account.name}
                </DialogTitle>
                <DialogDescription>
                  {t(`networth.kind.${account.kind}`)}
                </DialogDescription>
              </div>
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">{t('common.openMenu')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={handleEditClick}>
                    {t('common.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleArchiveClick}
                    className="text-destructive focus:text-destructive"
                  >
                    {t('networth.archive')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="pt-3">
              <p className="text-xs text-muted-foreground">
                {t('networth.detail.currentBalance')}
              </p>
              <p
                className={cn(
                  'text-2xl font-bold tabular-nums tracking-tight',
                  getBalanceClass(liability),
                )}
              >
                {renderLiabilitySign(liability)}
                {formatCurrency(
                  account.current_balance,
                  account.default_currency,
                )}
              </p>
              {renderSinceLast(isInvestment, snapshots, account.default_currency, t)}
              {renderInvestmentDetail(account, isInvestment, snapshots, t)}
            </div>
          </DialogHeader>

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

            {renderHistoryList(
              isLoading,
              isInvestment,
              snapshots,
              account.default_currency,
              account.name,
              dateLocale,
              (id) => setSnapshotToDelete(id),
              setSnapshotMode,
              t,
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={snapshotMode !== null}
        onOpenChange={() => setSnapshotMode(null)}
      >
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden"
          onOpenChange={() => setSnapshotMode(null)}
          onFocusOutside={(e) => e.preventDefault()}
        >
          {renderSnapshotForm(account, snapshotMode, () =>
            setSnapshotMode(null),
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
      >
        <AlertDialogContent
          className="sm:max-w-[425px]"
          onOpenChange={setShowArchiveDialog}
        >
          <AlertDialogHeader data-draggable-area>
            <AlertDialogTitle>
              {t('networth.archiveTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('networth.archiveConfirmation', { name: account.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('networth.archive')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(snapshotToDelete)}
        onOpenChange={(open) => !open && setSnapshotToDelete(null)}
      >
        <AlertDialogContent
          className="sm:max-w-[425px]"
          onOpenChange={(open: boolean) =>
            !open && setSnapshotToDelete(null)
          }
        >
          <AlertDialogHeader data-draggable-area>
            <AlertDialogTitle>
              {t('networth.detail.deleteSnapshotTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('networth.detail.deleteSnapshotDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSnapshotDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AccountDetailSheet;

