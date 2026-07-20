import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FALLBACK_PLAN_PRICES,
  formatPlanAmount,
  yearlyPerMonthAmount,
  type ProPlanPrices,
} from '@/lib/proPlans';
import {
  loadPlanPricesSnapshot,
  savePlanPricesSnapshot,
} from '@/lib/proPlansCache';
import { proPlansService } from '@/services/proPlansService';

export type ProPlansDisplay = {
  prices: ProPlanPrices;
  // Ready-to-render labels, e.g. "€1.99".
  monthlyLabel: string;
  yearlyLabel: string;
  yearlyPerMonthLabel: string;
};

// One request per app load no matter how many consumers mount (landing
// pricing, upgrade dialog, billing section can all be alive at once).
let inFlight: Promise<ProPlanPrices> | null = null;

// Live Pro prices with cache-then-network semantics: compiled-in fallback on
// first paint, localStorage snapshot when fresh, network refresh otherwise.
export const useProPlans = (): ProPlansDisplay => {
  const { i18n } = useTranslation();
  const [prices, setPrices] = useState<ProPlanPrices>(() => {
    const snapshot = loadPlanPricesSnapshot();
    if (snapshot) return snapshot;

    return FALLBACK_PLAN_PRICES;
  });

  useEffect(() => {
    // A fresh snapshot means the state already holds live prices.
    if (loadPlanPricesSnapshot()) return;

    let cancelled = false;

    if (!inFlight) {
      // Save once here (not per consumer) and always release the slot so a
      // later stale-cache mount fetches again instead of reusing old data.
      inFlight = proPlansService
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
          setPrices(fresh);
        }
      })
      .catch(() => {
        // Endpoint unreachable — keep showing the fallback prices and let
        // the next mount retry.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const locale = i18n.language || 'en';

  return useMemo(() => buildDisplay(prices, locale), [prices, locale]);
};

// --- Helpers ---

const buildDisplay = (
  prices: ProPlanPrices,
  locale: string,
): ProPlansDisplay => ({
  prices,
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
});
