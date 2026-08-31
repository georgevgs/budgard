import { useState } from 'react';
import { format } from 'date-fns';
import { parseCurrencyInput } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useIncomeOps } from '@/hooks/dataOps/useIncomeOps';
import { prepareStoredTransactionAmount } from '@/lib/transactionAmount';
import type { CurrencyConversionApi } from '@/hooks/currency/useCurrencyConversionCore';
import type { IncomeFormData } from '@/lib/validations';
import type { Expense } from '@/types/Expense';

type UseIncomeSubmitArgs = {
  income: Expense | undefined;
  conversion: CurrencyConversionApi;
  onClose: (savedIncome?: Expense) => void;
};

export const useIncomeSubmit = ({
  income,
  conversion,
  onClose,
}: UseIncomeSubmitArgs) => {
  const { session } = useAuth();
  const { handleIncomeSubmit } = useIncomeOps();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: IncomeFormData) => {
    if (!session?.user?.id) return;

    setIsSubmitting(true);
    try {
      const rawAmount = parseCurrencyInput(values.amount);
      const dateStr = format(values.date, 'yyyy-MM-dd');
      const amount = await prepareStoredTransactionAmount(
        rawAmount,
        conversion,
      );

      const payload: Partial<Expense> = {
        ...amount,
        description: values.description,
        category_id: normalizeCategoryId(values.category_id),
        date: dateStr,
        user_id: session.user.id,
      };

      const saved = await handleIncomeSubmit(payload, income?.id);
      onClose(saved ?? undefined);
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
