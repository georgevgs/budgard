import { useCallback, useEffect, useState } from 'react';
import { fetchExchangeRate } from '@/services/exchangeRateService';

// Wraps the exchange-rate service so components don't reach into services
// directly. Auto-fetches whenever (from, to, date) changes and exposes
// ensureRate() for one-off submit-time lookups when the cached rate is stale.
export type UseExchangeRateResult = {
  rate: number | null;
  isFetching: boolean;
  error: boolean;
  ensureRate: () => Promise<number>;
}

export const useExchangeRate = (
  fromCurrency: string,
  date: string | undefined,
  toCurrency: string,
): UseExchangeRateResult => {
  const [rate, setRate] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (fromCurrency === toCurrency) {
      setRate(null);
      setError(false);

      return;
    }

    if (!date) {
      return;
    }

    const controller = new AbortController();
    setIsFetching(true);
    setError(false);

    fetchExchangeRate(fromCurrency, date, controller.signal, toCurrency)
      .then((next) => {
        if (controller.signal.aborted) {
          return;
        }
        setRate(next);
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }
        setError(true);
        setRate(null);
      })
      .finally(() => {
        if (controller.signal.aborted) {
          return;
        }
        setIsFetching(false);
      });

    return () => controller.abort();
  }, [fromCurrency, date, toCurrency]);

  const ensureRate = useCallback(async (): Promise<number> => {
    if (rate !== null) {
      return rate;
    }

    return fetchExchangeRate(fromCurrency, date ?? '', undefined, toCurrency);
  }, [rate, fromCurrency, date, toCurrency]);

  return { rate, isFetching, error, ensureRate };
};
