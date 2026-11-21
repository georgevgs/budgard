import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadEdgeHandler } from './edgeFunctionHarness';

const SECRET = 'test-runtime-value';
const USER_ID = 'user-1';
const EVENT_CREATED = 1_800_000_000;
const ITEM_PERIOD_END = 1_810_000_000;
const TOP_LEVEL_PERIOD_END = 1_820_000_000;

const nowInSeconds = () => Math.floor(Date.now() / 1000);

const sign = (body: string, timestamp: number) =>
  createHmac('sha256', SECRET).update(`${timestamp}.${body}`).digest('hex');

const subscriptionObject = (overrides: Record<string, unknown> = {}) => ({
  id: 'sub_1',
  customer: 'cus_1',
  status: 'active',
  cancel_at_period_end: false,
  cancel_at: null,
  ended_at: null,
  trial_end: null,
  livemode: false,
  metadata: { user_id: USER_ID },
  items: {
    data: [
      { current_period_end: ITEM_PERIOD_END, price: { id: 'price_monthly' } },
    ],
  },
  ...overrides,
});

const eventBody = (
  subscription: Record<string, unknown> = subscriptionObject(),
  type = 'customer.subscription.updated',
) =>
  JSON.stringify({
    type,
    created: EVENT_CREATED,
    data: { object: subscription },
  });

const postRequest = (body: string, signatureHeader: string | null) => {
  const headers = new Headers();
  if (null !== signatureHeader) {
    headers.set('Stripe-Signature', signatureHeader);
  }

  return new Request('https://example.test', {
    method: 'POST',
    headers,
    body,
  });
};

const signedRequest = (body: string) =>
  postRequest(body, `t=${nowInSeconds()},v1=${sign(body, nowInSeconds())}`);

const setup = (rpcResult: unknown = { error: null }) => {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  const handler = loadEdgeHandler('stripe-webhook', {
    createClient: () => ({ rpc }),
  });

  return { handler, rpc };
};

afterEach(() => vi.restoreAllMocks());

describe('stripe webhook request checks', () => {
  it('refuses anything but POST', async () => {
    const { handler, rpc } = setup();
    const response = await handler(
      new Request('https://example.test', { method: 'GET' }),
    );

    expect(response.status).toBe(405);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses a missing signature', async () => {
    const { handler, rpc } = setup();
    const response = await handler(postRequest(eventBody(), null));

    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses a wrong signature', async () => {
    const { handler, rpc } = setup();
    const wrongSignature = sign('another body', nowInSeconds());
    const response = await handler(
      postRequest(eventBody(), `t=${nowInSeconds()},v1=${wrongSignature}`),
    );

    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses a valid signature older than the five minute tolerance', async () => {
    const { handler, rpc } = setup();
    const body = eventBody();
    const staleTimestamp = nowInSeconds() - 301;
    const response = await handler(
      postRequest(body, `t=${staleTimestamp},v1=${sign(body, staleTimestamp)}`),
    );

    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('accepts a rolled secret where only the second v1 entry is valid', async () => {
    const { handler, rpc } = setup();
    const body = eventBody();
    const timestamp = nowInSeconds();
    const staleSignature = 'a'.repeat(64);
    const response = await handler(
      postRequest(
        body,
        `t=${timestamp},v1=${staleSignature},v1=${sign(body, timestamp)}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

describe('stripe webhook event filtering', () => {
  it('acknowledges events that are not subscription events', async () => {
    const { handler, rpc } = setup();
    const response = await handler(
      signedRequest(eventBody(subscriptionObject(), 'invoice.paid')),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('ignores a live mode event in a test mode environment', async () => {
    const { handler, rpc } = setup();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handler(
      signedRequest(eventBody(subscriptionObject({ livemode: true }))),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('acknowledges a subscription that names no user', async () => {
    const { handler, rpc } = setup();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handler(
      signedRequest(eventBody(subscriptionObject({ metadata: {} }))),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('stripe webhook subscription mapping', () => {
  it('stores the subscription with the item level period end', async () => {
    const { handler, rpc } = setup();
    const response = await handler(signedRequest(eventBody()));

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      'apply_subscription_event',
      expect.objectContaining({
        p_user_id: USER_ID,
        p_status: 'active',
        p_stripe_price_id: 'price_monthly',
        p_renews_at: new Date(ITEM_PERIOD_END * 1000).toISOString(),
        p_event_at: new Date(EVENT_CREATED * 1000).toISOString(),
      }),
    );
  });

  it('falls back to the top level period end of older payloads', async () => {
    const { handler, rpc } = setup();
    const olderPayload = subscriptionObject({
      current_period_end: TOP_LEVEL_PERIOD_END,
      items: { data: [{ price: { id: 'price_monthly' } }] },
    });
    const response = await handler(signedRequest(eventBody(olderPayload)));

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      'apply_subscription_event',
      expect.objectContaining({
        p_renews_at: new Date(TOP_LEVEL_PERIOD_END * 1000).toISOString(),
      }),
    );
  });
});

describe('stripe webhook storage failures', () => {
  it('acknowledges an event for a user that no longer exists', async () => {
    const { handler } = setup({
      error: { code: '23503', message: 'violates foreign key constraint' },
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handler(signedRequest(eventBody()));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(log).toHaveBeenCalledWith(
      'stripe-webhook: customer.subscription.updated for sub_1 names a user that no longer exists',
    );
  });

  it('asks Stripe to retry on any other storage error', async () => {
    const { handler } = setup({
      error: { code: 'XX000', message: 'internal error' },
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handler(signedRequest(eventBody()));

    expect(response.status).toBe(500);
  });
});
