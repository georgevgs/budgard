import { describe, it, expect } from 'vitest';
import { isSubscriptionPro } from '@/lib/subscription';
import type { Subscription, SubscriptionStatus } from '@/types/Subscription';

const NOW = new Date('2026-07-20T12:00:00Z');

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
    expect(isSubscriptionPro(null, NOW)).toBe(false);
  });

  it.each<SubscriptionStatus>(['active', 'trialing', 'past_due'])(
    'returns true for %s status',
    (status) => {
      const subscription = makeSubscription({ status });
      expect(isSubscriptionPro(subscription, NOW)).toBe(true);
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
    expect(isSubscriptionPro(subscription, NOW)).toBe(false);
  });

  it('keeps access for a cancelled subscription still inside its paid period', () => {
    // Stripe models "cancelled but paid up" as status active with
    // cancel_at_period_end set; the status only flips at period end.
    const subscription = makeSubscription({
      status: 'active',
      cancel_at_period_end: true,
      ends_at: '2026-08-20T12:00:00Z',
    });
    expect(isSubscriptionPro(subscription, NOW)).toBe(true);
  });

  it('revokes access once Stripe flips the subscription to canceled', () => {
    const subscription = makeSubscription({
      status: 'canceled',
      cancel_at_period_end: true,
      ends_at: '2026-07-01T00:00:00Z',
    });
    expect(isSubscriptionPro(subscription, NOW)).toBe(false);
  });

  describe('expiry safety net (lost terminal webhook)', () => {
    it('keeps access while an active subscription is inside the grace window', () => {
      // Paid period lapsed two days ago but the terminal webhook has not
      // arrived; the short grace window absorbs delivery delays.
      const subscription = makeSubscription({
        renews_at: '2026-07-18T12:00:00Z',
        ends_at: null,
      });
      expect(isSubscriptionPro(subscription, NOW)).toBe(true);
    });

    it('revokes a still-"active" subscription well past its paid period', () => {
      // The canceled webhook never arrived; without the safety net this row
      // would grant Pro forever.
      const subscription = makeSubscription({
        renews_at: '2026-07-10T12:00:00Z',
        ends_at: null,
      });
      expect(isSubscriptionPro(subscription, NOW)).toBe(false);
    });

    it('keeps past_due access through the long payment-retry window', () => {
      const subscription = makeSubscription({
        status: 'past_due',
        renews_at: '2026-07-05T12:00:00Z',
      });
      expect(isSubscriptionPro(subscription, NOW)).toBe(true);
    });

    it('revokes past_due access once the retry window is exhausted', () => {
      const subscription = makeSubscription({
        status: 'past_due',
        renews_at: '2026-06-01T12:00:00Z',
      });
      expect(isSubscriptionPro(subscription, NOW)).toBe(false);
    });

    it('uses the latest of the period fields as the paid-through date', () => {
      // A scheduled cancellation keeps ends_at in the future while renews_at
      // stays at the already-elapsed period boundary.
      const subscription = makeSubscription({
        status: 'active',
        cancel_at_period_end: true,
        renews_at: '2026-07-01T12:00:00Z',
        ends_at: '2026-08-01T12:00:00Z',
      });
      expect(isSubscriptionPro(subscription, NOW)).toBe(true);
    });

    it('falls back to status alone when no period fields are present', () => {
      const subscription = makeSubscription({
        renews_at: null,
        ends_at: null,
        trial_ends_at: null,
      });
      expect(isSubscriptionPro(subscription, NOW)).toBe(true);
    });
  });
});
