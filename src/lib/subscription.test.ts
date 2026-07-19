import { describe, it, expect } from 'vitest';
import { isSubscriptionPro } from '@/lib/subscription';
import type { Subscription, SubscriptionStatus } from '@/types/Subscription';

const makeSubscription = (
  overrides: Partial<Subscription> = {},
): Subscription => ({
  id: 'sub-row-1',
  user_id: 'user-1',
  stripe_subscription_id: 'sub_123',
  stripe_customer_id: 'cus_456',
  stripe_price_id: 'price_789',
  status: 'active',
  cancel_at_period_end: false,
  trial_ends_at: null,
  renews_at: '2026-08-20T12:00:00Z',
  ends_at: null,
  livemode: true,
  created_at: '2026-07-20T10:00:00Z',
  updated_at: '2026-07-20T10:00:00Z',
  ...overrides,
});

describe('isSubscriptionPro', () => {
  it('returns false when there is no subscription', () => {
    expect(isSubscriptionPro(null)).toBe(false);
  });

  it.each<SubscriptionStatus>(['active', 'trialing', 'past_due'])(
    'returns true for %s status',
    (status) => {
      const subscription = makeSubscription({ status });
      expect(isSubscriptionPro(subscription)).toBe(true);
    },
  );

  it.each<SubscriptionStatus>([
    'canceled',
    'unpaid',
    'paused',
    'incomplete',
    'incomplete_expired',
  ])('returns false for %s status', (status) => {
    const subscription = makeSubscription({ status });
    expect(isSubscriptionPro(subscription)).toBe(false);
  });

  it('keeps access for a cancelled subscription still inside its paid period', () => {
    // Stripe models "cancelled but paid up" as status active with
    // cancel_at_period_end set; the status only flips at period end.
    const subscription = makeSubscription({
      status: 'active',
      cancel_at_period_end: true,
      ends_at: '2026-08-20T12:00:00Z',
    });
    expect(isSubscriptionPro(subscription)).toBe(true);
  });

  it('revokes access once Stripe flips the subscription to canceled', () => {
    const subscription = makeSubscription({
      status: 'canceled',
      cancel_at_period_end: true,
      ends_at: '2026-07-01T00:00:00Z',
    });
    expect(isSubscriptionPro(subscription)).toBe(false);
  });
});
