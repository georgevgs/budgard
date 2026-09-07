import { useCallback, useEffect, useState } from 'react';
import { fetchExchangeRate } from '@/common/api/exchangeRateService';

// Wraps the exchange-rate service so components don't reach into services
// directly. Auto-fetches whenever (from, to, date) changes and exposes
// ensureRate() for one-off submit-time lookups when the cached rate is stale.
export type UseExchangeRateReturn = {
  rate: number | null;
  isFetching: boolean;
  hasError: boolean;
  ensureRate: () => Promise<number>;
};

export const useExchangeRate = (
  fromCurrency: string,
  date: string | undefined,
  toCurrency: string,
): UseExchangeRateReturn => {
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
        setFetched({ key, rate: next, hasError: false });
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }
        setFetched({ key, rate: null, hasError: true });
      });

    return () => controller.abort();
  }, [fromCurrency, date, toCurrency]);

  const { rate, isFetching, hasError } = deriveRateView(
    fetched,
    requestKey,
    fromCurrency === toCurrency,
    Boolean(date),
  );

  // `rate` is deliberately stale-while-refetching so the preview does not
  // blank between keystrokes. That is right for a preview and wrong for a
  // write: switching USD → JPY and submitting inside the fetch window used to
  // stamp the row with original_currency JPY and the USD rate — an amount
  // wrong by two orders of magnitude, carrying a rate that was never true for
  // that pair, so the error could not be spotted afterwards from the row.
  // Only a rate fetched for THIS key can be returned; anything else refetches.
  const ensureRate = useCallback(async (): Promise<number> => {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    if (
      fetched !== null &&
      fetched.key === requestKey &&
      fetched.rate !== null
    ) {
      return fetched.rate;
    }

    return fetchExchangeRate(fromCurrency, date ?? '', undefined, toCurrency);
  }, [fetched, requestKey, fromCurrency, date, toCurrency]);

  return { rate, isFetching, hasError, ensureRate };
};

type FetchedRate = {
  key: string;
  rate: number | null;
  hasError: boolean;
};

type RateView = {
  rate: number | null;
  isFetching: boolean;
  hasError: boolean;
};

const deriveRateView = (
  fetched: FetchedRate | null,
  requestKey: string,
  isSameCurrency: boolean,
  hasDate: boolean,
): RateView => {
  if (isSameCurrency) {
    return { rate: null, isFetching: false, hasError: false };
  }

  if (!hasDate) {
    // No date selected — keep returning the last fetched value.
    return { rate: fetched?.rate ?? null, isFetching: false, hasError: false };
  }

  if (fetched !== null && fetched.key === requestKey) {
    return {
      rate: fetched.rate,
      isFetching: false,
      hasError: fetched.hasError,
    };
  }

  // The fetch for this key is still in flight — keep showing the previous
  // rate (stale-while-refetching) instead of blanking it.
  return { rate: fetched?.rate ?? null, isFetching: true, hasError: false };
};
