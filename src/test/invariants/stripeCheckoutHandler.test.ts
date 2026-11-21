import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadEdgeHandler } from './edgeFunctionHarness';

const USER_ID = 'user-1';

const jsonResponder = () => (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const checkoutRequest = (plan: string, isAuthorized = true) => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (isAuthorized) {
    headers.set('Authorization', `Bearer ${'a'.repeat(40)}`);
  }

  return new Request('https://example.test', {
    method: 'POST',
    headers,
    body: JSON.stringify({ plan }),
  });
};

type SubscriptionRead = {
  data: { status: string; stripe_customer_id: string } | null;
  error: unknown;
};

type StoredSessionRead = {
  data: { stripe_session_id: string } | null;
  error: unknown;
};

const NEW_SESSION_ID = 'cs_new';

const setup = ({
  isPasswordless = true,
  isAllowed = true,
  subscription = { data: null, error: null },
  storedSession = { data: null, error: null },
  isExpireOk = true,
}: {
  isPasswordless?: boolean;
  isAllowed?: boolean;
  subscription?: SubscriptionRead;
  storedSession?: StoredSessionRead;
  isExpireOk?: boolean;
} = {}) => {
  const rpc = vi.fn().mockResolvedValue({ data: isAllowed, error: null });
  const maybeSingle = vi.fn().mockResolvedValue(subscription);
  const from = vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle })) }));
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: USER_ID, email: 'person@example.test' } },
    error: null,
  });
  const userClient = { auth: { getUser }, rpc, from };
  const storedMaybeSingle = vi.fn().mockResolvedValue(storedSession);
  const eq = vi.fn(() => ({ maybeSingle: storedMaybeSingle }));
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const adminFrom = vi.fn(() => ({ select: vi.fn(() => ({ eq })), upsert }));
  const adminClient = { from: adminFrom };
  const fetchStripe = vi.fn();
  fetchStripe.mockImplementation(async (url: string, init: RequestInit) =>
    stripeReply(url, init, isExpireOk),
  );
  vi.stubGlobal('fetch', fetchStripe);
  const handler = loadEdgeHandler('stripe-checkout', {
    createClient: (...clientArguments: unknown[]) =>
      pickClient(clientArguments, userClient, adminClient),
    corsHeadersFor: () => ({}),
    jsonResponder,
    isPasswordlessSession: vi.fn().mockReturnValue(isPasswordless),
    hasPriorStripeSubscription: vi.fn().mockResolvedValue(false),
    resolveStripeCustomerReference: () => null,
  });

  return { handler, fetchStripe, adminFrom, eq, upsert };
};

const stripeReply = (url: string, init: RequestInit, isExpireOk: boolean) => {
  if (url.endsWith('/expire') && 'POST' === init.method) {
    return { ok: isExpireOk, status: 400, text: async () => 'not open' };
  } else {
    return {
      ok: true,
      json: async () => ({
        id: NEW_SESSION_ID,
        url: 'https://checkout.test/s',
      }),
    };
  }
};

// The user client carries the caller's Authorization header as a third
// argument, the service-role client is built from a URL and a key alone.
const pickClient = (
  clientArguments: unknown[],
  userClient: unknown,
  adminClient: unknown,
) => {
  if (3 === clientArguments.length) {
    return userClient;
  } else {
    return adminClient;
  }
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('stripe checkout refusals', () => {
  it('refuses a request without an Authorization header', async () => {
    const { handler, fetchStripe } = setup();
    const response = await handler(checkoutRequest('monthly', false));

    expect(response.status).toBe(401);
    expect(fetchStripe).not.toHaveBeenCalled();
  });

  it('asks a password session to sign in again', async () => {
    const { handler, fetchStripe } = setup({ isPasswordless: false });
    const response = await handler(checkoutRequest('monthly'));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'reauth_required' });
    expect(fetchStripe).not.toHaveBeenCalled();
  });

  it('refuses an unknown plan', async () => {
    const { handler, fetchStripe } = setup();
    const response = await handler(checkoutRequest('weekly'));

    expect(response.status).toBe(400);
    expect(fetchStripe).not.toHaveBeenCalled();
  });

  it('stops a caller who used up their checkout attempts', async () => {
    const { handler, fetchStripe } = setup({ isAllowed: false });
    const response = await handler(checkoutRequest('monthly'));

    expect(response.status).toBe(429);
    expect(fetchStripe).not.toHaveBeenCalled();
  });

  it('does not create checkout when the subscription lookup fails', async () => {
    const { handler, fetchStripe } = setup({
      subscription: { data: null, error: new Error('database unavailable') },
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handler(checkoutRequest('monthly'));

    expect(response.status).toBe(503);
    expect(fetchStripe).not.toHaveBeenCalled();
  });

  it('refuses a second checkout for an active subscriber', async () => {
    const { handler, fetchStripe } = setup({
      subscription: {
        data: { status: 'active', stripe_customer_id: 'cus_1' },
        error: null,
      },
    });
    const response = await handler(checkoutRequest('monthly'));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Already subscribed' });
    expect(fetchStripe).not.toHaveBeenCalled();
  });

  it('sends a paused subscriber to the portal instead of a second checkout', async () => {
    const { handler, fetchStripe } = setup({
      subscription: {
        data: { status: 'paused', stripe_customer_id: 'cus_1' },
        error: null,
      },
    });
    const response = await handler(checkoutRequest('monthly'));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'manage_billing' });
    expect(fetchStripe).not.toHaveBeenCalled();
  });
});

describe('stripe checkout session', () => {
  it('gives a first time subscriber a trial and a stable idempotency key', async () => {
    const { handler, fetchStripe } = setup();
    const response = await handler(checkoutRequest('monthly'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: 'https://checkout.test/s' });
    expect(fetchStripe).toHaveBeenCalledTimes(1);
    const [, init] = fetchStripe.mock.calls[0];
    const params = new URLSearchParams(init.body.toString());
    expect(params.get('subscription_data[trial_period_days]')).toBe('7');
    expect(params.get('subscription_data[metadata][user_id]')).toBe(USER_ID);
    expect(
      init.headers['Idempotency-Key'].startsWith(
        `checkout:${USER_ID}:monthly:trial:`,
      ),
    ).toBe(true);
  });
});

describe('stripe checkout open session', () => {
  it('records the new session when none was open', async () => {
    const { handler, fetchStripe, adminFrom, eq, upsert } = setup();
    const response = await handler(checkoutRequest('monthly'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: 'https://checkout.test/s' });
    expect(fetchStripe).toHaveBeenCalledTimes(1);
    expect(adminFrom).toHaveBeenCalledWith('open_checkout_sessions');
    expect(eq).toHaveBeenCalledWith('user_id', USER_ID);
    expect(upsert).toHaveBeenCalledWith({
      user_id: USER_ID,
      stripe_session_id: NEW_SESSION_ID,
    });
  });

  it('expires the previous open session before recording the new one', async () => {
    const { handler, fetchStripe, upsert } = setup({
      storedSession: { data: { stripe_session_id: 'cs_old' }, error: null },
    });
    const response = await handler(checkoutRequest('yearly'));

    expect(response.status).toBe(200);
    expect(fetchStripe).toHaveBeenCalledTimes(2);
    const [createUrl, createInit] = fetchStripe.mock.calls[0];
    const [expireUrl, expireInit] = fetchStripe.mock.calls[1];
    expect(createUrl).toBe('https://api.stripe.com/v1/checkout/sessions');
    expect(expireUrl).toBe(
      'https://api.stripe.com/v1/checkout/sessions/cs_old/expire',
    );
    expect(expireInit.method).toBe('POST');
    expect(expireInit.headers).toMatchObject({
      Authorization: createInit.headers.Authorization,
      'Stripe-Version': createInit.headers['Stripe-Version'],
    });
    expect(upsert).toHaveBeenCalledWith({
      user_id: USER_ID,
      stripe_session_id: NEW_SESSION_ID,
    });
  });

  it('does not expire the session an idempotent replay returned again', async () => {
    const { handler, fetchStripe } = setup({
      storedSession: {
        data: { stripe_session_id: NEW_SESSION_ID },
        error: null,
      },
    });
    const response = await handler(checkoutRequest('monthly'));

    expect(response.status).toBe(200);
    expect(fetchStripe).toHaveBeenCalledTimes(1);
  });

  it('still returns the checkout when expiring the old session fails', async () => {
    const { handler } = setup({
      storedSession: { data: { stripe_session_id: 'cs_old' }, error: null },
      isExpireOk: false,
    });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const response = await handler(checkoutRequest('yearly'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: 'https://checkout.test/s' });
    expect(consoleError).toHaveBeenCalled();
  });

  it('still returns the checkout when the open session read fails', async () => {
    const { handler } = setup({
      storedSession: { data: null, error: new Error('database unavailable') },
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handler(checkoutRequest('yearly'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: 'https://checkout.test/s' });
  });
});
