import { useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';
import { parseCurrencyInput } from '@/lib/utils';
import { useDataConfig } from '@/contexts/DataContext';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import type { ExpenseFormData } from '@/lib/validations';
import type { Expense } from '@/types/Expense';

export const useCurrencyConversion = (
  form: UseFormReturn<ExpenseFormData>,
  expense: Expense | undefined,
) => {
  const { defaultCurrency } = useDataConfig();
  const [selectedCurrency, setSelectedCurrency] = useState(
    expense?.original_currency ?? defaultCurrency,
  );
  const [submitRateError, setSubmitRateError] = useState(false);

  const watchedAmount = form.watch('amount');
  const watchedDateStr = toDateString(form.watch('date'));

  const {
    rate: exchangeRate,
    isFetching: isFetchingRate,
    error: fetchRateError,
    ensureRate,
  } = useExchangeRate(selectedCurrency, watchedDateStr, defaultCurrency);

  const previewConvertedAmount = useMemo(() => {
    if (selectedCurrency === defaultCurrency || !exchangeRate) return null;
    const raw = parseCurrencyInput(watchedAmount);
    if (!raw) return null;

    return Math.round(raw * exchangeRate * 100) / 100;
  }, [exchangeRate, selectedCurrency, watchedAmount, defaultCurrency]);

  const handleCurrencyChange = (value: string) => {
    setSelectedCurrency(value);
    setSubmitRateError(false);
  };

  const flagRateError = () => setSubmitRateError(true);

  return {
    defaultCurrency,
    selectedCurrency,
    isFetchingRate,
    hasRateError: fetchRateError || submitRateError,
    previewConvertedAmount,
    ensureRate,
    handleCurrencyChange,
    flagRateError,
  };
};

export type CurrencyConversionApi = ReturnType<typeof useCurrencyConversion>;

// --- Helpers ---

const toDateString = (date: Date | undefined): string => {
  if (!date) return '';

  return format(date, 'yyyy-MM-dd');
};
