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
  const [fetched, setFetched] = useState<FetchedRate | null>(null);

  const requestKey = `${fromCurrency}|${date}|${toCurrency}`;

  useEffect(() => {
    if (fromCurrency === toCurrency) {
      return;
    }

    if (!date) {
      return;
    }

    const key = `${fromCurrency}|${date}|${toCurrency}`;
    const controller = new AbortController();

    fetchExchangeRate(fromCurrency, date, controller.signal, toCurrency)
      .then((next) => {
        if (controller.signal.aborted) {
          return;
        }
        setFetched({ key, rate: next, error: false });
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }
        setFetched({ key, rate: null, error: true });
      });

    return () => controller.abort();
  }, [fromCurrency, date, toCurrency]);

  const { rate, isFetching, error } = deriveRateView(
    fetched,
    requestKey,
    fromCurrency === toCurrency,
    Boolean(date),
  );

  const ensureRate = useCallback(async (): Promise<number> => {
    if (rate !== null) {
      return rate;
    }

    return fetchExchangeRate(fromCurrency, date ?? '', undefined, toCurrency);
  }, [rate, fromCurrency, date, toCurrency]);

  return { rate, isFetching, error, ensureRate };
};

// --- Helpers ---

type FetchedRate = {
  key: string;
  rate: number | null;
  error: boolean;
};

type RateView = {
  rate: number | null;
  isFetching: boolean;
  error: boolean;
};

const deriveRateView = (
  fetched: FetchedRate | null,
  requestKey: string,
  sameCurrency: boolean,
  hasDate: boolean,
): RateView => {
  if (sameCurrency) {
    return { rate: null, isFetching: false, error: false };
  }

  if (!hasDate) {
    // No date selected — keep returning the last fetched value.
    return { rate: fetched?.rate ?? null, isFetching: false, error: false };
  }

  if (fetched !== null && fetched.key === requestKey) {
    return { rate: fetched.rate, isFetching: false, error: fetched.error };
  }

  // The fetch for this key is still in flight — keep showing the previous
  // rate (stale-while-refetching) instead of blanking it.
  return { rate: fetched?.rate ?? null, isFetching: true, error: false };
};
