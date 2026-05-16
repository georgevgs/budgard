import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
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
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import { formatCurrency } from '@/lib/utils';
import { useDebtOps } from '@/hooks/dataOps/useDebtOps';
import { useExpenseOps } from '@/hooks/dataOps/useExpenseOps';
import { useDateLocale } from '@/hooks/useDateLocale';
import type { Locale } from 'date-fns';
import { useDebtProgress, type DebtProgress } from '@/hooks/useDebtProgress';
import { useDebtPayments } from '@/hooks/useDebtPayments';
import type { Debt } from '@/types/Debt';
import type { Expense } from '@/types/Expense';
import DebtPaymentForm from '@/components/debts/DebtPaymentForm';
import DebtProgressBar from '@/components/debts/DebtProgressBar';

type Props = {
  debt: Debt;
  open: boolean;
  onClose: () => void;
  onEdit: (debt: Debt) => void;
}

const DebtDetailSheet = ({ debt, open, onClose, onEdit }: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { handleDebtArchive } = useDebtOps();
  const { handleExpenseDelete } = useExpenseOps();
  const progress = useDebtProgress(debt);
  const { payments, isLoading, removePayment } = useDebtPayments(
    debt.id,
    open,
    debt.updated_at,
  );
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleArchiveClick = () => {
    setMenuOpen(false);
    setTimeout(() => setShowArchiveDialog(true), 0);
  };

  const handleArchiveConfirm = async () => {
    setShowArchiveDialog(false);
    try {
      await handleDebtArchive(debt.id);
      onClose();
    } catch {
      // toast already shown
    }
  };

  const handleEditClick = () => {
    setMenuOpen(false);
    setTimeout(() => onEdit(debt), 0);
  };

  const handlePaymentDeleteConfirm = async () => {
    if (!paymentToDelete) {
      return;
    }

    const id = paymentToDelete;
    setPaymentToDelete(null);
    try {
      await handleExpenseDelete(id);
      removePayment(id);
    } catch {
      // toast already shown
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden flex flex-col max-h-[85vh]"
          aria-describedby="debt-detail-description"
          onOpenChange={onClose}
        >
          <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
            <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
          </div>

          <DialogHeader className="p-4 pb-2" data-draggable-area>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl truncate">
                  {debt.name}
                </DialogTitle>
                <DialogDescription>
                  {t(`debts.kind.${debt.kind}`)} · {t('debts.aprSuffix', { apr: debt.apr.toFixed(2) })}
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
                    {t('debts.archive')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="pt-3">
              <p className="text-xs text-muted-foreground">
                {t('debts.detail.currentBalance')}
              </p>
              <p className="text-2xl font-bold tabular-nums tracking-tight text-destructive">
                {formatCurrency(debt.current_balance, debt.currency)}
              </p>
            </div>

            <div className="pt-3">
              <DebtProgressBar progress={progress} currency={debt.currency} />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 text-xs">
              <div>
                <p className="text-muted-foreground">
                  {t('debts.detail.minPayment')}
                </p>
                <p className="font-medium tabular-nums mt-0.5">
                  {formatCurrency(debt.minimum_payment, debt.currency)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t('debts.detail.payoffIn')}
                </p>
                <p className="font-medium tabular-nums mt-0.5">
                  {renderPayoffMonths(progress, t)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t('debts.detail.totalInterest')}
                </p>
                <p className="font-medium tabular-nums mt-0.5">
                  {formatCurrency(progress.projectedTotalInterest, debt.currency)}
                </p>
              </div>
            </div>

            {renderUnpayableCallout(progress.isUnpayable, t)}
          </DialogHeader>

          <div
            className="overflow-y-auto flex-1 px-4 pb-4 overscroll-contain"
            style={{ touchAction: 'pan-y' }}
            id="debt-detail-description"
          >
            <div className="flex items-center justify-between pt-2 pb-2">
              <h3 className="text-sm font-medium">
                {t('debts.detail.history')}
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsPaymentOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('debts.detail.logPayment')}
              </Button>
            </div>

            {renderHistoryList(
              isLoading,
              payments,
              debt.currency,
              dateLocale,
              (id) => setPaymentToDelete(id),
              t,
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentOpen} onOpenChange={() => setIsPaymentOpen(false)}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden"
          onOpenChange={() => setIsPaymentOpen(false)}
          onFocusOutside={(e) => e.preventDefault()}
        >
          <DebtPaymentForm
            debt={debt}
            onClose={() => setIsPaymentOpen(false)}
          />
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
              {t('debts.archiveTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('debts.archiveConfirmation', { name: debt.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('debts.archive')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(paymentToDelete)}
        onOpenChange={(open) => !open && setPaymentToDelete(null)}
      >
        <AlertDialogContent
          className="sm:max-w-[425px]"
          onOpenChange={(open: boolean) =>
            !open && setPaymentToDelete(null)
          }
        >
          <AlertDialogHeader data-draggable-area>
            <AlertDialogTitle>
              {t('debts.detail.deletePaymentTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('debts.detail.deletePaymentDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePaymentDeleteConfirm}
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

export default DebtDetailSheet;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderPayoffMonths = (
  progress: DebtProgress,
  t: TranslateFunction,
) => {
  if (progress.isUnpayable || progress.monthsRemaining <= 0) {
    return '—';
  }

  return t('debts.monthsCount', { count: progress.monthsRemaining });
};

const renderUnpayableCallout = (
  isUnpayable: boolean,
  t: TranslateFunction,
) => {
  if (!isUnpayable) return null;

  return (
    <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      <div className="text-xs">
        <p className="font-medium text-destructive">
          {t('debts.unpayable.title')}
        </p>
        <p className="text-destructive/80 mt-0.5">
          {t('debts.unpayable.description')}
        </p>
      </div>
    </div>
  );
}

const renderHistoryList = (
  isLoading: boolean,
  payments: Expense[],
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

  if (payments.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-6">
        {t('debts.detail.noHistory')}
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {payments.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-border/40 bg-card/50"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium tabular-nums">
              {formatCurrency(p.amount, currency)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {format(parseISO(p.date), 'PPP', { locale: dateLocale })}
              {renderDescription(p.description)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => onDelete(p.id)}
            aria-label={t('common.delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

const renderDescription = (description: string | null | undefined) => {
  if (!description) return null;

  return <span className="ml-1">· {description}</span>;
}
