import type { Subscription, SubscriptionStatus } from '@/types/Subscription';

// past_due keeps access while Stripe retries the failed payment; the
// subscription moves to unpaid or canceled when the retries run out.
// A cancelled-but-paid-up subscription needs no special case here: Stripe
// keeps status 'active' (with cancel_at_period_end set) until the period the
// user already paid for ends, and only then flips it to 'canceled'.
const ACTIVE_STATUSES: SubscriptionStatus[] = ['trialing', 'active', 'past_due'];

export const isSubscriptionPro = (subscription: Subscription | null): boolean => {
  if (!subscription) return false;

  return ACTIVE_STATUSES.includes(subscription.status);
};
