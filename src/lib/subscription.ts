import type { Subscription, SubscriptionStatus } from '@/types/Subscription';

// past_due keeps access while Stripe retries the failed payment; the
// subscription moves to unpaid or canceled when the retries run out.
// A cancelled-but-paid-up subscription needs no special case here: Stripe
// keeps status 'active' (with cancel_at_period_end set) until the period the
// user already paid for ends, and only then flips it to 'canceled'.
const ACTIVE_STATUSES: SubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
];

// Status alone trusts that Stripe's terminal webhook (canceled/unpaid) always
// arrives. If it never does, the row would stay 'active' forever, so access
// also lapses a grace window after the last date the subscription is known to
// be paid through. The default window only needs to absorb webhook delivery
// delays; past_due gets a much longer one because Stripe keeps retrying the
// failed payment for weeks before settling the final status.
const GRACE_DAYS_DEFAULT = 3;
const GRACE_DAYS_PAST_DUE = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export const isSubscriptionPro = (
  subscription: Subscription | null,
  now: Date = new Date(),
): boolean => {
  if (!subscription) return false;
  if (!ACTIVE_STATUSES.includes(subscription.status)) return false;

  const paidThrough = getPaidThrough(subscription);
  if (!paidThrough) return true;

  const graceMs = getGraceDays(subscription.status) * DAY_MS;

  return now.getTime() < paidThrough.getTime() + graceMs;
};

export const hasStripeBillingManagement = (
  subscription: Subscription | null,
): boolean => {
  if (!subscription) {
    return false;
  }
  if (!subscription.stripe_subscription_id.startsWith('sub_')) {
    return false;
  }

  const customerId = subscription.stripe_customer_id;
  if (customerId.startsWith('cus_')) {
    return true;
  }
  if (customerId.startsWith('acct_')) {
    return true;
  }

  return false;
};

// --- Helpers ---

// The latest date the subscription is known to be paid (or trialing) through.
// Null when the webhook payload carried none of the period fields; status
// alone decides then, exactly as before the safety net existed.
const getPaidThrough = (subscription: Subscription): Date | null => {
  const timestamps = [
    subscription.renews_at,
    subscription.ends_at,
    subscription.trial_ends_at,
  ]
    .filter((value): value is string => value !== null)
    .map((value) => new Date(value).getTime())
    .filter((time) => Number.isFinite(time));

  if (timestamps.length === 0) return null;

  return new Date(Math.max(...timestamps));
};

const getGraceDays = (status: SubscriptionStatus): number => {
  if (status === 'past_due') return GRACE_DAYS_PAST_DUE;

  return GRACE_DAYS_DEFAULT;
};
