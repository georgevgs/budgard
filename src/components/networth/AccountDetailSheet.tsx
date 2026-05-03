import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
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
import ArrowDownLeft from 'lucide-react/dist/esm/icons/arrow-down-left';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { cn, formatCurrency } from '@/lib/utils';
import { computeAccountXirr } from '@/lib/xirr';
import { computeAccountYtd, type YtdResult } from '@/lib/ytd';
import { useDataOperations } from '@/hooks/useDataOperations';
import { useAccountBalances } from '@/hooks/useAccountBalances';
import { useDateLocale } from '@/hooks/useDateLocale';
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
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
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

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderActionBar = (
  isInvestment: boolean,
  setMode: (mode: SnapshotMode) => void,
  t: TranslateFunction,
) => {
  if (!isInvestment) {
    return (
      <div className="flex pt-3">
        <Button
          className="flex-1"
          onClick={() => setMode('value')}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {t('networth.detail.addSnapshot')}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 pt-3">
      <Button
        onClick={() => setMode('contribution')}
        className="flex-col h-auto py-2.5 gap-1"
      >
        <ArrowDownLeft className="h-4 w-4" />
        <span className="text-xs leading-none">
          {t('networth.detail.logContribution')}
        </span>
      </Button>
      <Button
        variant="outline"
        onClick={() => setMode('withdrawal')}
        className="flex-col h-auto py-2.5 gap-1"
      >
        <ArrowUpRight className="h-4 w-4" />
        <span className="text-xs leading-none">
          {t('networth.detail.withdraw')}
        </span>
      </Button>
      <Button
        variant="outline"
        onClick={() => setMode('value')}
        className="flex-col h-auto py-2.5 gap-1"
      >
        <TrendingUp className="h-4 w-4" />
        <span className="text-xs leading-none">
          {t('networth.detail.updateValue')}
        </span>
      </Button>
    </div>
  );
};

const renderSinceLast = (
  isInvestment: boolean,
  snapshots: AccountBalance[],
  currency: string,
  t: TranslateFunction,
) => {
  if (!isInvestment) return null;
  if (snapshots.length < 2) return null;

  const latest = snapshots[0];
  const previous = snapshots[1];
  const latestContribution = latest.contribution_delta ?? 0;
  // Strip out the contribution so we show market movement, not deposits.
  const delta = latest.balance - previous.balance - latestContribution;

  if (delta === 0) return null;

  const isPositive = delta > 0;
  let pctText = '';
  if (previous.balance > 0) {
    const pct = (delta / previous.balance) * 100;
    pctText = ` (${renderGainSign(isPositive)}${pct.toFixed(1)}%)`;
  }

  return (
    <p
      className={cn(
        'text-xs font-medium tabular-nums pt-1',
        getGainClass(isPositive),
      )}
    >
      {renderGainSign(isPositive)}
      {formatCurrency(Math.abs(delta), currency)}
      {pctText} · {t('networth.detail.sinceLast')}
    </p>
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

  const hasBasis = account.cost_basis > 0;
  const ytd = computeAccountYtd(account, snapshots);

  // Truly nothing to summarize: no basis, no YTD baseline, and at most one
  // snapshot so "since last update" can't help either. Prompt for a deposit.
  if (!hasBasis && !ytd && snapshots.length <= 1) {
    return (
      <p className="text-xs text-muted-foreground pt-2">
        {t('networth.detail.noBasisHint')}
      </p>
    );
  }

  // Has data but nothing for the strip to show — "since last update" above
  // already covers the recent delta, so render nothing here.
  if (!hasBasis && !ytd) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-2 pt-2 text-xs">
      {renderInvestedKpi(account, hasBasis, t)}
      {renderAllTimeReturnKpi(account, hasBasis, t)}
      {renderYtd(ytd, account.default_currency, t)}
      {renderAnnualizedKpi(account, hasBasis, snapshots, t)}
    </div>
  );
};

const renderInvestedKpi = (
  account: Account,
  hasBasis: boolean,
  t: TranslateFunction,
) => {
  if (!hasBasis) return null;

  return (
    <div>
      <p className="text-muted-foreground">{t('networth.detail.costBasis')}</p>
      <p className="font-medium tabular-nums">
        {formatCurrency(account.cost_basis, account.default_currency)}
      </p>
    </div>
  );
};

const renderAllTimeReturnKpi = (
  account: Account,
  hasBasis: boolean,
  t: TranslateFunction,
) => {
  if (!hasBasis) return null;

  const gain = account.current_balance - account.cost_basis;
  const isPositive = gain >= 0;
  const returnPct = (gain / account.cost_basis) * 100;

  return (
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
  );
};

const renderAnnualizedKpi = (
  account: Account,
  hasBasis: boolean,
  snapshots: AccountBalance[],
  t: TranslateFunction,
) => {
  if (!hasBasis) return null;

  const annualized = computeAccountXirr(account, snapshots);

  return renderAnnualized(annualized, t);
};

const renderYtd = (
  ytd: YtdResult | null,
  currency: string,
  t: TranslateFunction,
) => {
  if (ytd == null) return null;

  const isPositive = ytd.growth >= 0;

  return (
    <div>
      <p className="text-muted-foreground">{t('networth.detail.ytd')}</p>
      <p
        className={cn(
          'font-medium tabular-nums',
          getGainClass(isPositive),
        )}
      >
        {renderGainSign(isPositive)}
        {formatCurrency(ytd.growth, currency)} (
        {renderGainSign(isPositive)}
        {ytd.pct.toFixed(1)}%)
      </p>
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
  isInvestment: boolean,
  snapshots: AccountBalance[],
  currency: string,
  accountName: string,
  dateLocale: Locale,
  onDelete: (id: string) => void,
  setMode: (mode: SnapshotMode) => void,
  t: TranslateFunction,
) => {
  if (isLoading) {
    return (
      <p className="text-center text-sm text-muted-foreground py-6">
        {t('common.loading')}
      </p>
    );
  }

  if (snapshots.length === 0 && isInvestment) {
    return renderInvestmentEmpty(accountName, setMode, t);
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
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/40 bg-card/50"
        >
          {renderActivityIcon(s)}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium truncate">
                {renderActivityLabel(s, t)}
              </p>
              <p
                className={cn(
                  'text-sm font-medium tabular-nums shrink-0',
                  getActivityAmountClass(s),
                )}
              >
                {renderActivityAmount(s, currency)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {format(parseISO(s.recorded_at), 'PP', { locale: dateLocale })}
              {renderActivityMeta(s, t)}
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

const renderInvestmentEmpty = (
  accountName: string,
  setMode: (mode: SnapshotMode) => void,
  t: TranslateFunction,
) => (
  <div className="flex flex-col items-center text-center gap-3 py-6 px-2">
    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
      <Sparkles className="h-5 w-5 text-primary" />
    </div>
    <div>
      <p className="text-sm font-medium">
        {t('networth.detail.investmentEmptyTitle', { name: accountName })}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {t('networth.detail.investmentEmptyHint')}
      </p>
    </div>
    <div className="flex flex-col w-full gap-2 mt-1">
      <Button onClick={() => setMode('contribution')}>
        <ArrowDownLeft className="h-4 w-4 mr-1.5" />
        {t('networth.detail.investmentEmptyDeposit')}
      </Button>
      <Button variant="outline" onClick={() => setMode('value')}>
        <TrendingUp className="h-4 w-4 mr-1.5" />
        {t('networth.detail.investmentEmptyValue')}
      </Button>
    </div>
  </div>
);

type ActivityKind = 'deposit' | 'withdrawal' | 'value';

const classifyActivity = (s: AccountBalance): ActivityKind => {
  const contribution = s.contribution_delta ?? 0;
  if (contribution > 0) return 'deposit';
  if (contribution < 0) return 'withdrawal';

  return 'value';
};

const renderActivityIcon = (s: AccountBalance) => {
  const kind = classifyActivity(s);
  const wrap = 'h-8 w-8 rounded-full flex items-center justify-center shrink-0';

  if (kind === 'deposit') {
    return (
      <div className={cn(wrap, 'bg-income/10 text-income')}>
        <ArrowDownLeft className="h-4 w-4" />
      </div>
    );
  }

  if (kind === 'withdrawal') {
    return (
      <div className={cn(wrap, 'bg-destructive/10 text-destructive')}>
        <ArrowUpRight className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className={cn(wrap, 'bg-primary/10 text-primary')}>
      <TrendingUp className="h-4 w-4" />
    </div>
  );
};

const renderActivityLabel = (
  s: AccountBalance,
  t: TranslateFunction,
) => {
  const kind = classifyActivity(s);
  if (kind === 'deposit') return t('networth.detail.activityDeposit');
  if (kind === 'withdrawal') return t('networth.detail.activityWithdrawal');

  return t('networth.detail.activityValueUpdate');
};

const renderActivityAmount = (s: AccountBalance, currency: string) => {
  const kind = classifyActivity(s);
  const contribution = s.contribution_delta ?? 0;

  if (kind === 'deposit') {
    return `+${formatCurrency(contribution, currency)}`;
  }
  if (kind === 'withdrawal') {
    return `−${formatCurrency(Math.abs(contribution), currency)}`;
  }

  return formatCurrency(s.balance, currency);
};

const getActivityAmountClass = (s: AccountBalance): string => {
  const kind = classifyActivity(s);
  if (kind === 'deposit') return 'text-income';
  if (kind === 'withdrawal') return 'text-destructive';

  return 'text-foreground';
};

const renderActivityMeta = (
  s: AccountBalance,
  t: TranslateFunction,
) => {
  const auto = parseAutoNote(s.note);
  if (auto) {
    return (
      <span className="ml-1">
        · {t('networth.detail.activityAuto', { description: auto })}
      </span>
    );
  }

  if (s.note) {
    return <span className="ml-1">· {s.note}</span>;
  }

  return null;
};

// The recurring-expense trigger writes notes as `Auto: <description>`. We
// surface the description as a "auto from X" badge instead of raw text.
const parseAutoNote = (note: string | null | undefined): string | null => {
  if (!note) return null;
  if (!note.startsWith('Auto: ')) return null;

  return note.slice('Auto: '.length);
};
