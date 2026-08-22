import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useExpensesData } from '@/contexts/DataContext';
import { useExpenseOps } from '@/hooks/dataOps/useExpenseOps';
import { parseCurrencyInput, amountToInput } from '@/lib/utils';
import { roundMoney, sumAmounts } from '@/lib/money';
import type { Expense } from '@/types/Expense';

type UseRefundDialogArgs = {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * State and limits for refunding a charge.
 *
 * The limit is what is still refundable, not what was originally charged.
 * Capping each refund against the original amount let the same €50 charge be
 * refunded €50 five times and net to −€200, because nothing tied a refund to
 * the row it reversed. `refunded_expense_id` does, so the remaining balance is
 * now answerable and the credit carries an audit trail back to its charge.
 */
export const useRefundDialog = ({
  expense,
  open,
  onOpenChange,
}: UseRefundDialogArgs) => {
  const { t } = useTranslation();
  const allExpenses = useExpensesData();
  const { handleExpenseSubmit } = useExpenseOps();

  const alreadyRefunded = sumRefundsFor(allExpenses, expense.id);
  const refundable = roundMoney(expense.amount - alreadyRefunded);

  const [amount, setAmount] = useState(() => amountToInput(refundable));
  const [date, setDate] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);

  const [prevInputs, setPrevInputs] = useState({ open, expense });
  const inputsChanged =
    prevInputs.open !== open || prevInputs.expense !== expense;
  if (inputsChanged) {
    setPrevInputs({ open, expense });
    if (open) {
      setAmount(amountToInput(refundable));
      setDate(new Date());
    }
  }

  const parsed = parseCurrencyInput(amount);

  const confirm = async () => {
    setIsSaving(true);
    try {
      await handleExpenseSubmit({
        amount: -parsed,
        description: t('expenses.refund.entryDescription', {
          description: expense.description,
        }),
        category_id: expense.category_id ?? null,
        refunded_expense_id: expense.id,
        // The local calendar day the user picked, not a UTC instant.
        date: format(date, 'yyyy-MM-dd'),
        type: 'expense',
      });
      onOpenChange(false);
    } catch {
      // error toast handled by useExpenseOps
    }
    setIsSaving(false);
  };

  return {
    amount,
    setAmount,
    date,
    setDate,
    isSaving,
    alreadyRefunded,
    refundable,
    canConfirm: parsed > 0 && parsed <= refundable && !isSaving,
    confirm,
  };
};

// --- Helpers ---

// Refunds are stored negative, so their magnitudes are what has come back.
const sumRefundsFor = (expenses: Expense[], expenseId: string): number => {
  const refunds = expenses
    .filter((row) => row.refunded_expense_id === expenseId)
    .map((row) => Math.abs(row.amount));

  return sumAmounts(refunds);
};
