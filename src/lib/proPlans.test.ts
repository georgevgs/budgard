import { describe, it, expect } from 'vitest';
import {
  FALLBACK_PLAN_PRICES,
  formatPlanAmount,
  planIdForPriceId,
  yearlyPerMonthAmount,
  yearlySavingsPercent,
  type ProPlanPrices,
} from '@/lib/proPlans';

describe('formatPlanAmount', () => {
  it('formats cents as a localized currency string', () => {
    expect(formatPlanAmount(199, 'EUR', 'en')).toBe('€1.99');
    expect(formatPlanAmount(1999, 'EUR', 'en')).toBe('€19.99');
  });

  it('never throws on a broken currency code', () => {
    expect(formatPlanAmount(199, 'NOPE', 'en')).toBe('€1.99');
  });
});

describe('yearlyPerMonthAmount', () => {
  it('floors so the advertised price never overstates the saving', () => {
    // 1999 / 12 = 166.58… — must show 166, not 167.
    expect(yearlyPerMonthAmount(1999)).toBe(166);
  });
});

describe('yearlySavingsPercent', () => {
  it('compares the advertised per-month prices (€1.66 vs €1.99 → 17%)', () => {
    expect(yearlySavingsPercent(FALLBACK_PLAN_PRICES)).toBe(17);
  });

  it('returns 0 when yearly is not actually cheaper', () => {
    const prices: ProPlanPrices = {
      monthly: { priceId: null, amount: 199, currency: 'EUR' },
      yearly: { priceId: null, amount: 2400, currency: 'EUR' },
    };

    expect(yearlySavingsPercent(prices)).toBe(0);
  });

  it('returns 0 on a missing monthly price instead of dividing by zero', () => {
    const prices: ProPlanPrices = {
      monthly: { priceId: null, amount: 0, currency: 'EUR' },
      yearly: { priceId: null, amount: 1999, currency: 'EUR' },
    };

    expect(yearlySavingsPercent(prices)).toBe(0);
  });
});

describe('planIdForPriceId', () => {
  const prices: ProPlanPrices = {
    monthly: { priceId: 'price_m', amount: 199, currency: 'EUR' },
    yearly: { priceId: 'price_y', amount: 1999, currency: 'EUR' },
  };

  it('maps known Stripe price ids to plans', () => {
    expect(planIdForPriceId(prices, 'price_m')).toBe('monthly');
    expect(planIdForPriceId(prices, 'price_y')).toBe('yearly');
  });

  it('returns null for unknown price ids', () => {
    expect(planIdForPriceId(prices, 'price_old')).toBeNull();
  });

  it('returns null on fallback data whose price ids are unknown', () => {
    expect(planIdForPriceId(FALLBACK_PLAN_PRICES, 'price_m')).toBeNull();
  });
});
