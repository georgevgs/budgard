import { useState } from 'react';
import { format } from 'date-fns';
import { parseCurrencyInput } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { collectExpenseTagIds } from '@/lib/expenseTags';
import { prepareStoredTransactionAmount } from '@/lib/transactionAmount';
import type { ReceiptOptions } from '@/hooks/dataOps/useExpenseOps';
import type { CurrencyConversionApi } from '@/hooks/expenseForm/useCurrencyConversion';
import type { ExpenseFormData } from '@/lib/validations';
import type { ExpenseWritePayload } from '@/services/dataService';
import type { Expense } from '@/types/Expense';

type UseExpenseSubmitArgs = {
  expense: Expense | undefined;
  conversion: CurrencyConversionApi;
  receiptFile: File | null;
  removeExistingReceipt: boolean;
  onSubmit: (
    data: ExpenseWritePayload,
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
      const amount = await prepareStoredTransactionAmount(
        rawAmount,
        conversion,
      );

      // Primary tag first, extras after — re-derived here so the "extras
      // never exist without a primary" invariant holds even if the form
      // cleared tag_id while extras were still selected.
      const orderedTagIds = collectExpenseTagIds(
        values.tag_id,
        values.extra_tag_ids,
      );

      const expenseData: ExpenseWritePayload = {
        ...amount,
        description: values.description,
        category_id: normalizeCategoryId(values.category_id),
        tag_id: orderedTagIds[0] ?? null,
        extra_tag_ids: pickExtraTagIds(orderedTagIds, Boolean(expense)),
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

// Edits always send the array (an empty one clears stale extras server-side);
// creates omit it when there is nothing to attach.
const pickExtraTagIds = (
  orderedTagIds: string[],
  isEditing: boolean,
): string[] | undefined => {
  const extraTagIds = orderedTagIds.slice(1);
  if (isEditing) return extraTagIds;

  if (extraTagIds.length === 0) return undefined;

  return extraTagIds;
};
