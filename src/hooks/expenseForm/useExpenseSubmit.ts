import { useState } from 'react';
import { format } from 'date-fns';
import { parseCurrencyInput } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { ReceiptOptions } from '@/hooks/dataOps/useExpenseOps';
import type { CurrencyConversionApi } from '@/hooks/expenseForm/useCurrencyConversion';
import type { ExpenseFormData } from '@/lib/validations';
import type { Expense } from '@/types/Expense';

type UseExpenseSubmitArgs = {
  expense: Expense | undefined;
  conversion: CurrencyConversionApi;
  receiptFile: File | null;
  removeExistingReceipt: boolean;
  onSubmit: (
    data: Partial<Expense>,
    expenseId?: string,
    receiptOptions?: ReceiptOptions,
  ) => void;
  onClose: () => void;
};

export const useExpenseSubmit = ({
  expense,
  conversion,
  receiptFile,
  removeExistingReceipt,
  onSubmit,
  onClose,
}: UseExpenseSubmitArgs) => {
  const { session } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: ExpenseFormData) => {
    if (!session?.user?.id) return;

    setIsSubmitting(true);
    try {
      const rawAmount = parseCurrencyInput(values.amount);
      const dateStr = format(values.date, 'yyyy-MM-dd');
      let finalAmount = rawAmount;
      let originalAmount: number | null = null;
      let originalCurrency: string | null = null;
      let exchangeRateValue: number | null = null;

      if (conversion.selectedCurrency !== conversion.defaultCurrency) {
        const rate = await conversion.ensureRate();
        finalAmount = Math.round(rawAmount * rate * 100) / 100;
        originalAmount = rawAmount;
        originalCurrency = conversion.selectedCurrency;
        exchangeRateValue = rate;
      }

      const expenseData: Partial<Expense> = {
        amount: finalAmount,
        original_amount: originalAmount,
        original_currency: originalCurrency,
        exchange_rate: exchangeRateValue,
        description: values.description,
        category_id: normalizeCategoryId(values.category_id),
        tag_id: values.tag_id || null,
        date: dateStr,
        user_id: session.user.id,
      };

      onSubmit(expenseData, expense?.id, {
        receiptFile,
        removeExistingReceipt,
        existingReceiptPath: expense?.receipt_path ?? null,
      });
      onClose();
    } catch {
      conversion.flagRateError();
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, handleSubmit };
};

// --- Helpers ---

const normalizeCategoryId = (categoryId: string): string | null => {
  if (categoryId === 'none') return null;

  return categoryId;
};
