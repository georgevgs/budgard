import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FALLBACK_PLAN_PRICES,
  formatPlanAmount,
  yearlyPerMonthAmount,
  type ProPlanPrices,
} from '@/constants/proPlans';
import {
  loadPlanPricesSnapshot,
  savePlanPricesSnapshot,
} from '@/constants/proPlansCache';
import { proApi } from '@/common/api/proApi';

export type UseProPlansReturn = {
  prices: ProPlanPrices;
  isLoading: boolean;
  // Ready-to-render labels, e.g. "€1.99".
  monthlyLabel: string;
  yearlyLabel: string;
  yearlyPerMonthLabel: string;
};

// One request per app load no matter how many consumers mount (landing
// pricing, upgrade dialog, billing section can all be alive at once).
let inFlight: Promise<ProPlanPrices> | null = null;

// Live Pro prices with cache-then-network semantics: a fresh snapshot can
// paint immediately; a cache miss stays explicitly unknown until the endpoint
// either returns or fails, at which point the compiled fallback is honest.
export const useProPlans = (): UseProPlansReturn => {
  const { i18n } = useTranslation();
  const [state, setState] = useState(() => {
    const snapshot = loadPlanPricesSnapshot();
    if (snapshot) {
      return { prices: snapshot, isLoading: false };
    }

    return { prices: FALLBACK_PLAN_PRICES, isLoading: true };
  });

  useEffect(() => {
    let cancelled = false;

    // Another consumer can finish the shared request between this component's
    // render and effect. Adopt the snapshot it just wrote; returning without
    // doing so would leave this instance stuck in its unknown state.
    const snapshot = loadPlanPricesSnapshot();
    if (snapshot) {
      queueMicrotask(() => {
        if (!cancelled) {
          setState({ prices: snapshot, isLoading: false });
        }
      });

      return () => {
        cancelled = true;
      };
    }

    if (!inFlight) {
      // Save once here (not per consumer) and always release the slot so a
      // later stale-cache mount fetches again instead of reusing old data.
      inFlight = proApi
        .getPlanPrices()
        .then((fresh) => {
          savePlanPricesSnapshot(fresh);

          return fresh;
        })
        .finally(() => {
          inFlight = null;
        });
    }

    inFlight
      .then((fresh) => {
        if (!cancelled) {
          setState({ prices: fresh, isLoading: false });
        }
      })
      .catch(() => {
        // Endpoint unreachable — the fallback is now the best available
        // answer, rather than a temporary value shown as if it were live.
        if (!cancelled) {
          setState({ prices: FALLBACK_PLAN_PRICES, isLoading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const locale = i18n.language || 'en';

  return useMemo(
    () => buildDisplay(state.prices, locale, state.isLoading),
    [state.isLoading, state.prices, locale],
  );
};

const buildDisplay = (
  prices: ProPlanPrices,
  locale: string,
  isLoading: boolean,
): UseProPlansReturn => {
  if (isLoading) {
    return {
      prices,
      isLoading,
      monthlyLabel: '—',
      yearlyLabel: '—',
      yearlyPerMonthLabel: '—',
    };
  }

  return {
    prices,
    isLoading,
    monthlyLabel: formatPlanAmount(
      prices.monthly.amount,
      prices.monthly.currency,
      locale,
    ),
    yearlyLabel: formatPlanAmount(
      prices.yearly.amount,
      prices.yearly.currency,
      locale,
    ),
    yearlyPerMonthLabel: formatPlanAmount(
      yearlyPerMonthAmount(prices.yearly.amount),
      prices.yearly.currency,
      locale,
    ),
  };
};
