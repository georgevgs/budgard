import type { UseFormReturn } from 'react-hook-form';
import { useCurrencyConversionCore } from '@/common/hooks/currency/useCurrencyConversionCore';
import type { ExpenseFormData } from '@/pages/expenses/validations';
import type { Expense } from '@/types/Expense';

export const useCurrencyConversion = (
  form: UseFormReturn<ExpenseFormData>,
  expense: Expense | undefined,
) =>
  useCurrencyConversionCore(
    form.watch('amount'),
    form.watch('date'),
    expense?.original_currency,
  );

export type { CurrencyConversionApi } from '@/common/hooks/currency/useCurrencyConversionCore';
