import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadEdgeHandler } from './edgeFunctionHarness';
import {
  deliverPush,
  PUSH_SUBSCRIPTION_LIMIT,
  readAllPages,
  runPool,
} from '../../../supabase/functions/_shared/pushDelivery.ts';

const request = (isAuthorized = true) => {
  const headers = new Headers();
  if (isAuthorized) {
    headers.set('Authorization', `Bearer ${'a'.repeat(40)}`);
  }

  return { method: 'POST', headers } as Request;
};

// A paged read ends in .order(...).range(from, to), whatever came before it.
const pagedQuery = (rows: unknown[]) => {
  const chain = {
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);

  return chain;
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
    readAllPages,
    runPool,
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
    const rpcResults: Record<string, unknown> = {
      push_cron_secret_matches: Promise.resolve({ data: true, error: null }),
      get_recurring_due_on: pagedQuery([
        {
          user_id: 'u1',
          recurring_expense_id: 'r1',
          description: 'Bill',
          amount: 10,
          default_currency: 'EUR',
        },
      ]),
    };
    rpc.mockImplementation(
      (name: string) => rpcResults[name] ?? pagedQuery([]),
    );
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

      return { select: vi.fn(() => pagedQuery([])) };
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

describe('push batch scaling', () => {
  it('keeps reading past the 1000-row response cap', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => index);
    const readPage = vi
      .fn()
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: [1000, 1001], error: null });

    const { data, error } = await readAllPages('rows', readPage);

    expect(error).toBeNull();
    expect(data).toHaveLength(1002);
    expect(readPage).toHaveBeenNthCalledWith(1, 0, 999);
    expect(readPage).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('reports a failed page instead of returning a partial list', async () => {
    const failure = new Error('database unavailable');
    const firstPage = Array.from({ length: 1000 }, (_, index) => index);
    const readPage = vi
      .fn()
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: null, error: failure });
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(await readAllPages('rows', readPage)).toEqual({
        data: null,
        error: failure,
      });
      expect(log).toHaveBeenCalledTimes(1);
    } finally {
      log.mockRestore();
    }
  });

  it('ends the run when the opt-out settings cannot be read', async () => {
    const { handler, from, rpc, webpush } = setup([{ id: 'device-1' }]);
    const rpcResults: Record<string, unknown> = {
      push_cron_secret_matches: Promise.resolve({ data: true, error: null }),
    };
    rpc.mockImplementation(
      (name: string) => rpcResults[name] ?? pagedQuery([]),
    );
    const failing = pagedQuery([]);
    failing.range.mockResolvedValue({
      data: null,
      error: new Error('database unavailable'),
    });
    const audience = {
      limit: vi
        .fn()
        .mockResolvedValue({ data: [{ id: 'device-1' }], error: null }),
    };
    // Only the settings read fails. Every other read answers, so a 500 can
    // only come from the settings failure itself.
    const queries: Record<string, unknown> = {
      push_subscriptions: audience,
      'user_id, notification_preferences, daily_reminder_hour': failing,
    };
    from.mockImplementation((table = '') => ({
      select: vi.fn(
        (columns: string) =>
          queries[table] ?? queries[columns] ?? pagedQuery([]),
      ),
    }));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect((await handler(request())).status).toBe(500);
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it('never runs more tasks at once than the pool allows, and keeps order', async () => {
    const running = { now: 0, peak: 0 };
    const results = await runPool([1, 2, 3, 4, 5, 6, 7], 3, async (item) => {
      running.now += 1;
      running.peak = Math.max(running.peak, running.now);
      await Promise.resolve();
      running.now -= 1;

      return item * 2;
    });

    expect(results).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(running.peak).toBe(3);
  });
});
