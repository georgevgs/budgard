import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import { formatCurrency } from '@/lib/utils';
import { useDebtDetailActions } from '@/hooks/debts/useDebtDetailActions';
import { useDateLocale } from '@/hooks/useDateLocale';
import type { Locale } from 'date-fns';
import { useDebtProgress } from '@/hooks/useDebtProgress';
import { useDebtPayments } from '@/hooks/useDebtPayments';
import type { Debt } from '@/types/Debt';
import type { Expense } from '@/types/Expense';
import DebtDetailHeader from '@/components/debts/DebtDetailHeader';
import DebtPaymentForm from '@/components/debts/DebtPaymentForm';
import ConfirmDestructiveDialog from '@/components/common/ConfirmDestructiveDialog';

type Props = {
  debt: Debt;
  open: boolean;
  onClose: () => void;
  onEdit: (debt: Debt) => void;
};

const DebtDetailSheet = ({ debt, open, onClose, onEdit }: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const progress = useDebtProgress(debt);
  const { payments, isLoading, hasError, retry, removePayment } =
    useDebtPayments(debt.id, open, debt.updated_at);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const actions = useDebtDetailActions({ debt, onClose, removePayment });

  const handleOpenChange = createOpenChangeHandler(
    () => setIsPaymentOpen(false),
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
            isPaymentOpen,
            <>
              <div
                className="flex justify-center pb-2 pt-3 sm:hidden"
                data-drag-handle
              >
                <div className="h-1.5 w-12 rounded-full bg-muted-foreground/20" />
              </div>

              <DebtDetailHeader
                debt={debt}
                progress={progress}
                onEdit={onEdit}
                onArchiveRequest={() => actions.setShowArchiveDialog(true)}
              />

              <div
                className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4"
                style={{ touchAction: 'pan-y' }}
              >
                <div className="flex items-center justify-between pb-2 pt-2">
                  <h3 className="text-sm font-medium">
                    {t('debts.detail.history')}
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsPaymentOpen(true)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {t('debts.detail.logPayment')}
                  </Button>
                </div>

                {renderHistoryList(
                  isLoading,
                  hasError,
                  payments,
                  debt.currency,
                  dateLocale,
                  (id) => actions.setPaymentToDelete(id),
                  retry,
                  t,
                )}
              </div>
            </>,
          )}

          {renderPaymentForm(debt, isPaymentOpen, () =>
            setIsPaymentOpen(false),
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDestructiveDialog
        open={actions.showArchiveDialog}
        title={t('debts.archiveTitle')}
        description={t('debts.archiveConfirmation', { name: debt.name })}
        confirmLabel={t('debts.archive')}
        onOpenChange={actions.setShowArchiveDialog}
        onConfirm={actions.handleArchiveConfirm}
      />

      <ConfirmDestructiveDialog
        open={Boolean(actions.paymentToDelete)}
        title={t('debts.detail.deletePaymentTitle')}
        description={t('debts.detail.deletePaymentDescription')}
        confirmLabel={t('common.delete')}
        onOpenChange={(isOpen) => {
          if (!isOpen) actions.setPaymentToDelete(null);
        }}
        onConfirm={actions.handlePaymentDeleteConfirm}
      />
    </>
  );
};

export default DebtDetailSheet;

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

const renderDetailView = (isPaymentOpen: boolean, children: ReactNode) => {
  if (isPaymentOpen) {
    return null;
  }

  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
};

const renderPaymentForm = (
  debt: Debt,
  isPaymentOpen: boolean,
  onClose: () => void,
) => {
  if (!isPaymentOpen) {
    return null;
  }

  return <DebtPaymentForm debt={debt} onClose={onClose} />;
};

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderHistoryList = (
  isLoading: boolean,
  hasError: boolean,
  payments: Expense[],
  currency: string,
  dateLocale: Locale,
  onDelete: (id: string) => void,
  onRetry: () => void,
  t: TranslateFunction,
) => {
  if (isLoading) {
    return (
      <p className="text-center text-sm text-muted-foreground py-6">
        {t('common.loading')}
      </p>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-center text-sm text-muted-foreground">
          {t('debts.detail.historyLoadFailed')}
        </p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t('common.tryAgain')}
        </Button>
      </div>
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
          className="tile flex items-center justify-between gap-3 rounded-lg px-3 py-2"
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
            className="h-11 w-11 -m-2 text-muted-foreground hover:text-destructive-ink shrink-0"
            onClick={() => onDelete(p.id)}
            aria-label={t('common.delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
};

const renderDescription = (description: string | null | undefined) => {
  if (!description) return null;

  return <span className="ml-1">· {description}</span>;
};
