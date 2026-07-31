import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
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
import { useExpenseOps } from '@/hooks/dataOps/useExpenseOps';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import type { Expense } from '@/types/Expense';

type Props = {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Records a refund as a negative expense in the same category, so spending
// totals, budgets and analytics all net out without special cases.
const RefundExpenseDialog = ({ expense, open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();
  const { handleExpenseSubmit } = useExpenseOps();
  const [amount, setAmount] = useState(() => toAmountInput(expense.amount));
  const [date, setDate] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);

  const [prevInputs, setPrevInputs] = useState({ open, expense });
  const inputsChanged =
    prevInputs.open !== open || prevInputs.expense !== expense;
  if (inputsChanged) {
    setPrevInputs({ open, expense });
    if (open) {
      setAmount(toAmountInput(expense.amount));
      setDate(new Date());
    }
  }

  const parsed = parseCurrencyInput(amount);
  const canConfirm = parsed > 0 && parsed <= expense.amount && !isSaving;

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await handleExpenseSubmit({
        amount: -parsed,
        description: t('expenses.refund.entryDescription', {
          description: expense.description,
        }),
        category_id: expense.category_id ?? null,
        date: format(date, 'yyyy-MM-dd'),
        type: 'expense',
      });
      onOpenChange(false);
    } catch {
      // error toast handled by useExpenseOps
    }
    setIsSaving(false);
  };

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

        <div className="space-y-4 px-1">
          <div className="space-y-1.5">
            <Label className="text-sm">{t('expenses.refund.amountLabel')}</Label>
            <CurrencyInput
              currency={defaultCurrency}
              value={amount}
              onChange={setAmount}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{t('expenses.refund.dateLabel')}</Label>
            <DatePickerField
              value={date}
              onChange={(next) => {
                if (next) setDate(next);
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
            disabled={isSaving}
          >
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
            {t('expenses.refund.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RefundExpenseDialog;

// --- Helpers ---

const toAmountInput = (amount: number): string => {
  return formatCurrencyInput(amount.toFixed(2).replace('.', ','));
};
