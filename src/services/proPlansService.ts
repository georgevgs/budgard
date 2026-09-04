import { type ProPlanPrice, type ProPlanPrices } from '@/lib/proPlans';

// Fetches the live Pro prices from the public stripe-prices Edge Function.
// Throws on any malformed payload so callers can fall back to the compiled-in
// prices instead of rendering garbage.
export const proPlansService = {
  async getPlanPrices(): Promise<ProPlanPrices> {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-prices`,
    );

    if (!response.ok) {
      throw new Error('Failed to load plan prices');
    }

    const body = (await response.json()) as Record<string, unknown>;

    return {
      monthly: parsePlanPrice(body?.monthly),
      yearly: parsePlanPrice(body?.yearly),
    };
  },
};

// --- Helpers ---

const parsePlanPrice = (value: unknown): ProPlanPrice => {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Malformed plan price');
  }

  const plan = value as Record<string, unknown>;
  const isValid =
    typeof plan.priceId === 'string' &&
    typeof plan.amount === 'number' &&
    plan.amount > 0 &&
    typeof plan.currency === 'string' &&
    /^[A-Za-z]{3}$/.test(plan.currency);

  if (!isValid) {
    throw new Error('Malformed plan price');
  }

  return {
    priceId: plan.priceId as string,
    amount: plan.amount as number,
    currency: (plan.currency as string).toUpperCase(),
  };
};
