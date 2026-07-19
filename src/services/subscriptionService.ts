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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || 'Failed to start checkout');
    }

    const { url } = (await response.json()) as { url: string };

    return url;
  },
};
