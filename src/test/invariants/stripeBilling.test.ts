import { describe, expect, it, vi } from 'vitest';
import {
  cancelStripeSubscription,
  resolveStripeCustomerReference,
  shouldCancelStripeSubscription,
} from '../../../supabase/functions/_shared/stripeBilling.ts';

const SECRET_KEY = 'test-restricted-key';

describe('Stripe billing helpers', () => {
  it('maps Customer and Customer Account ids to their API parameters', () => {
    expect(resolveStripeCustomerReference('cus_123')).toEqual({
      parameter: 'customer',
      id: 'cus_123',
    });
    expect(resolveStripeCustomerReference('acct_123')).toEqual({
      parameter: 'customer_account',
      id: 'acct_123',
    });
    expect(resolveStripeCustomerReference('invalid_123')).toBeNull();
    expect(resolveStripeCustomerReference(null)).toBeNull();
  });

  it.each(['trialing', 'active', 'incomplete', 'past_due', 'unpaid', 'paused'])(
    'cancels a %s subscription before account deletion',
    (status) => {
      expect(shouldCancelStripeSubscription(status)).toBe(true);
    },
  );

  it.each(['canceled', 'incomplete_expired'])(
    'skips a terminal %s subscription',
    (status) => {
      expect(shouldCancelStripeSubscription(status)).toBe(false);
    },
  );

  it('cancels an active Stripe subscription', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));

    await cancelStripeSubscription({
      subscriptionId: 'sub_123',
      secretKey: SECRET_KEY,
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.stripe.com/v1/subscriptions/sub_123',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: `Bearer ${SECRET_KEY}`,
          'Stripe-Version': '2026-07-29.dahlia',
        }),
      }),
    );
  });

  it('accepts an already-canceled subscription on retry', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 400 }))
      .mockResolvedValueOnce(
        Response.json({ status: 'canceled' }, { status: 200 }),
      );

    await cancelStripeSubscription({
      subscriptionId: 'sub_123',
      secretKey: SECRET_KEY,
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('fails closed when Stripe cannot confirm cancellation', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(
        Response.json({ status: 'active' }, { status: 200 }),
      );

    await expect(
      cancelStripeSubscription({
        subscriptionId: 'sub_123',
        secretKey: SECRET_KEY,
        fetcher,
      }),
    ).rejects.toThrow('Stripe cancellation failed with status 502');
  });

  it('rejects malformed subscription ids before calling Stripe', async () => {
    const fetcher = vi.fn();

    await expect(
      cancelStripeSubscription({
        subscriptionId: 'not-a-subscription',
        secretKey: SECRET_KEY,
        fetcher,
      }),
    ).rejects.toThrow('Invalid Stripe subscription id');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
