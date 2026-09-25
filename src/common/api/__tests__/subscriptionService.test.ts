import { describe, it, expect, vi, afterEach } from 'vitest';
import { supabase } from '@/config/supabase';
import { subscriptionService } from '@/common/api/subscriptionService';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getSubscription', () => {
  it('returns the user subscription row', async () => {
    const row = { id: 'sub-row-1', status: 'active' };
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
      }),
    } as never);

    await expect(subscriptionService.getSubscription()).resolves.toEqual(row);
  });

  it('returns null when the user has no subscription', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    } as never);

    await expect(subscriptionService.getSubscription()).resolves.toBeNull();
  });

  it('throws on query error', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'boom' } }),
      }),
    } as never);

    await expect(subscriptionService.getSubscription()).rejects.toEqual({
      message: 'boom',
    });
  });
});

describe('createCheckout', () => {
  it('posts the plan to the stripe-checkout function and returns the URL', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'jwt-token' } },
      error: null,
    } as never);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        url: 'https://checkout.stripe.com/c/pay/cs_test_abc',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const url = await subscriptionService.createCheckout('yearly');

    expect(url).toBe('https://checkout.stripe.com/c/pay/cs_test_abc');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/stripe-checkout'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-token',
        }),
        body: JSON.stringify({ plan: 'yearly' }),
      }),
    );
  });

  it('throws when not authenticated', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);

    await expect(subscriptionService.createCheckout('monthly')).rejects.toThrow(
      'Not authenticated',
    );
  });

  it('throws with the server error message on failure', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'jwt-token' } },
      error: null,
    } as never);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Server misconfigured' }),
      }),
    );

    await expect(subscriptionService.createCheckout('monthly')).rejects.toThrow(
      'Server misconfigured',
    );
  });
});

describe('createPortalSession', () => {
  it('posts to the stripe-portal function and returns the URL', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'jwt-token' } },
      error: null,
    } as never);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        url: 'https://billing.stripe.com/p/session/test_abc',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const url = await subscriptionService.createPortalSession();

    expect(url).toBe('https://billing.stripe.com/p/session/test_abc');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/stripe-portal'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-token',
        }),
      }),
    );
  });

  it('throws when not authenticated', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);

    await expect(subscriptionService.createPortalSession()).rejects.toThrow(
      'Not authenticated',
    );
  });
});

describe('billing redirect guard', () => {
  it.each([
    'http://checkout.stripe.com/c/pay/cs_test_abc',
    'https://checkout.stripe.com.attacker.example/pay',
    'https://attacker.example/?next=https://checkout.stripe.com',
    'javascript:alert(1)',
    'not a url',
  ])('refuses to hand the tab to %s', async (url) => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'jwt-token' } },
      error: null,
    } as never);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url }) }),
    );

    await expect(subscriptionService.createCheckout('monthly')).rejects.toThrow(
      'Failed to start checkout',
    );
  });
});
