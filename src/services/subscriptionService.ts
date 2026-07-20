import { supabase } from '@/lib/supabase';
import type { Subscription } from '@/types/Subscription';

export type CheckoutPlan = 'monthly' | 'yearly';

export const subscriptionService = {
  async getSubscription() {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .maybeSingle();

    if (error) throw error;

    return data as Subscription | null;
  },

  async createCheckout(plan: CheckoutPlan) {
    return callStripeFunction('stripe-checkout', {
      body: JSON.stringify({ plan }),
      fallbackError: 'Failed to start checkout',
    });
  },

  // Returns the URL of a Stripe-hosted customer portal session, where the
  // user cancels, updates payment details, and views invoices.
  async createPortalSession() {
    return callStripeFunction('stripe-portal', {
      fallbackError: 'Failed to open billing portal',
    });
  },
};

// --- Helpers ---

type StripeFunctionOptions = {
  body?: string;
  fallbackError: string;
};

const callStripeFunction = async (
  name: string,
  { body, fallbackError }: StripeFunctionOptions,
): Promise<string> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body,
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || fallbackError);
  }

  const { url } = (await response.json()) as { url: string };

  return url;
};
