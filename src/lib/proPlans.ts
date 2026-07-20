// Pro plan pricing model. The amounts Stripe actually charges live on Stripe
// Price objects; the stripe-prices Edge Function serves them so the UI can
// never drift from checkout. These fallbacks only cover the moments the
// endpoint is unreachable (offline, cold start before the fetch resolves).

export type ProPlanId = 'monthly' | 'yearly';

export type ProPlanPrice = {
  // Null on fallback data: without live data we cannot know the Stripe id.
  priceId: string | null;
  // Minor units (cents), matching Stripe's unit_amount.
  amount: number;
  // ISO 4217 code, e.g. 'EUR'.
  currency: string;
};

export type ProPlanPrices = Record<ProPlanId, ProPlanPrice>;

export const FALLBACK_PLAN_PRICES: ProPlanPrices = {
  monthly: { priceId: null, amount: 199, currency: 'EUR' },
  yearly: { priceId: null, amount: 1999, currency: 'EUR' },
};

export const formatPlanAmount = (
  amount: number,
  currency: string,
  locale: string,
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount / 100);
  } catch {
    // An unknown locale or currency code must never crash the paywall.
    return `€${(amount / 100).toFixed(2)}`;
  }
};

// Floor rather than round so the advertised per-month cost of the yearly
// plan is never higher than what twelve months actually cost.
export const yearlyPerMonthAmount = (yearlyAmount: number): number =>
  Math.floor(yearlyAmount / 12);

// Whole-percent saving of the yearly plan's advertised per-month price vs
// the monthly plan (e.g. €1.66 vs €1.99 → 17). Compared on the displayed
// per-month amounts so the badge always matches the prices next to it.
export const yearlySavingsPercent = (prices: ProPlanPrices): number => {
  const monthly = prices.monthly.amount;
  if (monthly <= 0) return 0;

  const saved = monthly - yearlyPerMonthAmount(prices.yearly.amount);
  if (saved <= 0) return 0;

  return Math.round((saved / monthly) * 100);
};

// Maps a subscription row's stripe_price_id back to a plan. Null when the
// price is unknown (fallback data, or a legacy/changed Stripe price).
export const planIdForPriceId = (
  prices: ProPlanPrices,
  stripePriceId: string,
): ProPlanId | null => {
  if (prices.monthly.priceId === stripePriceId) return 'monthly';
  if (prices.yearly.priceId === stripePriceId) return 'yearly';

  return null;
};
