import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadEdgeHandler } from './edgeFunctionHarness';
import {
  deliverPush,
  PUSH_SUBSCRIPTION_LIMIT,
} from '../../../supabase/functions/_shared/pushDelivery.ts';

const request = (isAuthorized = true) => {
  const headers = new Headers();
  if (isAuthorized) {
    headers.set('Authorization', `Bearer ${'a'.repeat(40)}`);
  }

  return { method: 'POST', headers } as Request;
};

const setup = (rows: unknown[], error: unknown = null) => {
  const limit = vi.fn().mockResolvedValue({ data: rows, error });
  const from = vi.fn((): Record<string, unknown> => ({
    select: vi.fn(() => ({ limit })),
  }));
  const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
  const webpush = {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
  };
  const handler = loadEdgeHandler('send-push-notifications', {
    createClient: () => ({ from, rpc }),
    webpush,
    deliverPush,
    PUSH_SUBSCRIPTION_LIMIT,
    corsHeadersFor: () => ({}),
  });

  return { handler, from, rpc, limit, webpush };
};

afterEach(() => vi.useRealTimers());

describe('push batch audience', () => {
  it('authenticates and returns an empty successful batch before evaluating reminders or initializing transport', async () => {
    const { handler, from, rpc, limit, webpush } = setup([]);
    const response = await handler(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      sent: 0,
      failed: 0,
      stale_cleaned: 0,
      notifications_evaluated: 0,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      'push_cron_secret_matches',
      expect.any(Object),
    );
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('push_subscriptions');
    expect(limit).toHaveBeenCalledWith(1);
    expect(webpush.setVapidDetails).not.toHaveBeenCalled();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('refuses untrusted callers before querying the audience', async () => {
    const { handler, from, rpc } = setup([]);
    expect((await handler(request(false))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValue({ data: false, error: null });
    expect((await handler(request())).status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('reports an audience lookup failure instead of treating it as no recipients', async () => {
    const { handler, webpush } = setup([], new Error('database unavailable'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const response = await handler(request());
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Internal server error' });
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it('still evaluates and delivers a reminder when a device is subscribed, with the paired cap', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T08:00:00Z'));
    const { handler, from, rpc, webpush } = setup([{ id: 'device-1' }]);
    rpc.mockImplementation(async (name: string) => {
      if (name === 'push_cron_secret_matches') {
        return { data: true, error: null };
      }
      if (name === 'get_recurring_due_on') {
        return {
          data: [
            {
              user_id: 'u1',
              recurring_expense_id: 'r1',
              description: 'Bill',
              amount: 10,
              default_currency: 'EUR',
            },
          ],
          error: null,
        };
      }

      return { data: [], error: null };
    });
    const subscription = {
      endpoint: 'https://web.push.apple.com/test',
      p256dh: 'B'.repeat(87),
      auth: 'A'.repeat(22),
    };
    const deliveryLimit = vi
      .fn()
      .mockResolvedValue({ data: [subscription], error: null });
    let audienceQueries = 0;
    from.mockImplementation((table?: string) => {
      if (table === 'push_subscriptions') {
        audienceQueries += 1;
        if (audienceQueries === 1) {
          return {
            select: vi.fn(() => ({
              limit: vi
                .fn()
                .mockResolvedValue({ data: [{ id: 'device-1' }], error: null }),
            })),
          };
        }
        const chain = { eq: vi.fn(), order: vi.fn(), limit: deliveryLimit };
        chain.eq.mockReturnValue(chain);
        chain.order.mockReturnValue(chain);

        return { select: vi.fn(() => chain) };
      }
      const chain = { data: [], error: null, eq: vi.fn() };
      chain.eq.mockReturnValue(chain);

      return { select: vi.fn(() => chain) };
    });
    const response = await handler(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      sent: 1,
      notifications_evaluated: 1,
    });
    expect(deliveryLimit).toHaveBeenCalledWith(PUSH_SUBSCRIPTION_LIMIT);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
  });
});
