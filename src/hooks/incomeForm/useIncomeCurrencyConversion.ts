import type { UseFormReturn } from 'react-hook-form';
import { useCurrencyConversionCore } from '@/hooks/currency/useCurrencyConversionCore';
import type { IncomeFormData } from '@/lib/validations';
import type { Expense } from '@/types/Expense';

export const useIncomeCurrencyConversion = (
  form: UseFormReturn<IncomeFormData>,
  income: Expense | undefined,
) =>
  useCurrencyConversionCore(
    form.watch('amount'),
    form.watch('date'),
    income?.original_currency,
  );
