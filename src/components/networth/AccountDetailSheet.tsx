import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns';
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
import Plus from 'lucide-react/dist/esm/icons/plus';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import { cn, formatCurrency } from '@/lib/utils';
import { computeAccountXirr } from '@/lib/xirr';
import { useDataOperations } from '@/hooks/useDataOperations';
import { useAccountBalances } from '@/hooks/useAccountBalances';
import { type Account, isLiability } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import BalanceSnapshotForm, {
  type SnapshotMode,
} from '@/components/networth/BalanceSnapshotForm';
import AccountHistoryChart from '@/components/networth/AccountHistoryChart';

type Props = {
  account: Account;
  open: boolean;
  onClose: () => void;
  onEdit: (account: Account) => void;
}

const AccountDetailSheet = ({ account, open, onClose, onEdit }: Props) => {
  const { t, i18n } = useTranslation();
  let dateLocale: Locale = enUS;
  if (i18n.language === 'el') {
    dateLocale = el;
  }
  const { handleAccountArchive, handleSnapshotDelete } = useDataOperations();
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
                  'text-2xl font-bold tabular-nums',
                  getBalanceClass(liability),
                )}
              >
                {renderLiabilitySign(liability)}
                {formatCurrency(
                  account.current_balance,
                  account.default_currency,
                )}
              </p>
              {renderInvestmentDetail(account, isInvestment, snapshots, t)}
            </div>
          </DialogHeader>

          <div
            className="overflow-y-auto flex-1 px-4 pb-4 overscroll-contain"
            style={{ touchAction: 'pan-y' }}
            id="account-detail-description"
          >
            <AccountHistoryChart account={account} snapshots={snapshots} />

            <div className="flex items-center justify-between pt-2 pb-2 gap-2">
              <h3 className="text-sm font-medium">
                {t('networth.detail.history')}
              </h3>
              <div className="flex items-center gap-2">
                {renderContributionButton(isInvestment, setSnapshotMode, t)}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSnapshotMode('value')}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {renderUpdateLabel(isInvestment, t)}
                </Button>
              </div>
            </div>

            {renderHistoryList(
              isLoading,
              snapshots,
              account.default_currency,
              dateLocale,
              (id) => setSnapshotToDelete(id),
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

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderUpdateLabel = (
  isInvestment: boolean,
  t: TranslateFunction,
) => {
  if (isInvestment) {
    return t('networth.detail.updateValue');
  }

  return t('networth.detail.addSnapshot');
};

const renderContributionButton = (
  isInvestment: boolean,
  setMode: (mode: SnapshotMode) => void,
  t: TranslateFunction,
) => {
  if (!isInvestment) return null;

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setMode('contribution')}
    >
      <Plus className="h-3.5 w-3.5 mr-1" />
      {t('networth.detail.logContribution')}
    </Button>
  );
};

const renderSnapshotForm = (
  account: Account,
  mode: SnapshotMode | null,
  onClose: () => void,
) => {
  if (mode === null) return null;

  return (
    <BalanceSnapshotForm account={account} onClose={onClose} mode={mode} />
  );
};

const renderInvestmentDetail = (
  account: Account,
  isInvestment: boolean,
  snapshots: AccountBalance[],
  t: TranslateFunction,
) => {
  if (!isInvestment) return null;

  const gain = account.current_balance - account.cost_basis;
  const isPositive = gain >= 0;
  let returnPct = 0;
  if (account.cost_basis > 0) {
    returnPct = (gain / account.cost_basis) * 100;
  }
  const annualized = computeAccountXirr(account, snapshots);

  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-2 pt-2 text-xs">
      <div>
        <p className="text-muted-foreground">{t('networth.detail.costBasis')}</p>
        <p className="font-medium tabular-nums">
          {formatCurrency(account.cost_basis, account.default_currency)}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">{t('networth.detail.gain')}</p>
        <p
          className={cn(
            'font-medium tabular-nums',
            getGainClass(isPositive),
          )}
        >
          {renderGainSign(isPositive)}
          {formatCurrency(gain, account.default_currency)} (
          {renderGainSign(isPositive)}
          {returnPct.toFixed(1)}%)
        </p>
      </div>
      {renderAnnualized(annualized, t)}
    </div>
  );
};

const renderAnnualized = (
  annualized: number | null,
  t: TranslateFunction,
) => {
  if (annualized == null) return null;

  const isPositive = annualized >= 0;
  const pct = annualized * 100;

  return (
    <div>
      <p className="text-muted-foreground">
        {t('networth.detail.annualized')}
      </p>
      <p
        className={cn(
          'font-medium tabular-nums',
          getGainClass(isPositive),
        )}
      >
        {renderGainSign(isPositive)}
        {pct.toFixed(1)}%
      </p>
    </div>
  );
};

const getBalanceClass = (liability: boolean): string => {
  if (liability) {
    return 'text-destructive';
  }

  return 'text-foreground';
};

const renderLiabilitySign = (liability: boolean): string => {
  if (liability) {
    return '−';
  }

  return '';
};

const getGainClass = (isPositive: boolean): string => {
  if (isPositive) {
    return 'text-income';
  }

  return 'text-destructive';
};

const renderGainSign = (isPositive: boolean): string => {
  if (isPositive) {
    return '+';
  }

  return '';
};

const renderHistoryList = (
  isLoading: boolean,
  snapshots: AccountBalance[],
  currency: string,
  dateLocale: Locale,
  onDelete: (id: string) => void,
  t: TranslateFunction,
) => {
  if (isLoading) {
    return (
      <p className="text-center text-sm text-muted-foreground py-6">
        {t('common.loading')}
      </p>
    );
  }

  if (snapshots.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-6">
        {t('networth.detail.noHistory')}
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {snapshots.map((s) => (
        <li
          key={s.id}
          className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-border/40 bg-card/50"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium tabular-nums">
              {formatCurrency(s.balance, currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(s.recorded_at), 'PPP', { locale: dateLocale })}
              {renderNote(s.note)}
              {renderContributionTag(s.contribution_delta, currency, t)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => onDelete(s.id)}
            aria-label={t('common.delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

const renderNote = (note: string | null | undefined) => {
  if (!note) return null;

  return <span className="ml-1">· {note}</span>;
}

const renderContributionTag = (
  contribution: number | null | undefined,
  currency: string,
  t: TranslateFunction,
) => {
  if (contribution == null || contribution === 0) return null;

  const isDeposit = contribution > 0;
  const label = isDeposit
    ? t('networth.detail.contribDeposit', {
        amount: formatCurrency(contribution, currency),
      })
    : t('networth.detail.contribWithdraw', {
        amount: formatCurrency(Math.abs(contribution), currency),
      });

  return <span className="ml-1">· {label}</span>;
}
