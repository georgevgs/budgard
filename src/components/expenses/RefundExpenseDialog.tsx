import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Label } from '@/components/ui/label';
import { useDataConfig } from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { useRefundDialog } from '@/hooks/expensesList/useRefundDialog';
import { formatCurrency } from '@/lib/utils';
import type { Expense } from '@/types/Expense';

type Props = {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Records a refund as a negative expense in the same category, so spending
// totals, budgets and analytics all net out without special cases. The row
// carries refunded_expense_id, which is both the audit trail back to the
// charge and what makes "how much is still refundable" answerable.
const RefundExpenseDialog = ({ expense, open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();
  const refund = useRefundDialog({ expense, open, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" onOpenChange={onOpenChange}>
        <DialogHeader data-draggable-area className="pt-2">
          <DialogTitle>{t('expenses.refund.title')}</DialogTitle>
          <DialogDescription>
            {t('expenses.refund.description', {
              description: expense.description,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-1">
          <div className="space-y-1.5">
            <Label className="text-sm">
              {t('expenses.refund.amountLabel')}
            </Label>
            <CurrencyInput
              currency={defaultCurrency}
              value={refund.amount}
              onChange={refund.setAmount}
              placeholder="0,00"
            />
            {renderRefundableHint(
              refund.alreadyRefunded,
              refund.refundable,
              defaultCurrency,
              t,
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{t('expenses.refund.dateLabel')}</Label>
            <DatePickerField
              value={refund.date}
              onChange={(next) => {
                if (next) refund.setDate(next);
              }}
              placeholder={t('expenses.pickDate')}
              locale={dateLocale}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pb-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={refund.isSaving}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={refund.confirm}
            disabled={!refund.canConfirm}
          >
            {t('expenses.refund.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RefundExpenseDialog;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

// Only shown once part of the charge has already come back — otherwise the
// refundable amount is just the charge, and saying so is noise.
const renderRefundableHint = (
  alreadyRefunded: number,
  refundable: number,
  currency: string,
  t: TranslateFunction,
) => {
  if (alreadyRefunded <= 0) return null;

  return (
    <p className="text-xs text-muted-foreground">
      {t('expenses.refund.remaining', {
        refunded: formatCurrency(alreadyRefunded, currency),
        remaining: formatCurrency(refundable, currency),
      })}
    </p>
  );
};
