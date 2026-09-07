import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { parseCurrencyInput } from '@/constants/utils';
import { convertMoney } from '@/constants/money';
import { useDataConfig } from '@/common/contexts/DataContext';
import { useExchangeRate } from '@/common/hooks/useExchangeRate';

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
  const [hasSubmitRateError, setHasSubmitRateError] = useState(false);

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

    return convertMoney(raw, exchangeRate, defaultCurrency);
  }, [exchangeRate, selectedCurrency, watchedAmount, defaultCurrency]);

  const handleCurrencyChange = (value: string) => {
    setSelectedCurrency(value);
    setHasSubmitRateError(false);
  };

  const flagRateError = () => setHasSubmitRateError(true);

  return {
    defaultCurrency,
    selectedCurrency,
    isFetchingRate,
    hasRateError: fetchRateError || hasSubmitRateError,
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
