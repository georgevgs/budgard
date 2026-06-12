import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { parseCurrencyInput } from '@/lib/utils';
import { useDataConfig } from '@/contexts/DataContext';
import { useExchangeRate } from '@/hooks/useExchangeRate';

// Shared currency-selection + live-conversion state for transaction forms.
export const useCurrencyConversionCore = (
  watchedAmount: string,
  watchedDate: Date | undefined,
  initialCurrency: string | null | undefined,
) => {
  const { defaultCurrency } = useDataConfig();
  const [selectedCurrency, setSelectedCurrency] = useState(
    initialCurrency ?? defaultCurrency,
  );
  const [submitRateError, setSubmitRateError] = useState(false);

  const watchedDateStr = toDateString(watchedDate);

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

export type CurrencyConversionApi = ReturnType<
  typeof useCurrencyConversionCore
>;

// --- Helpers ---

const toDateString = (date: Date | undefined): string => {
  if (!date) return '';

  return format(date, 'yyyy-MM-dd');
};
