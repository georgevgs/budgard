const STRIPE_API_BASE = 'https://api.stripe.com/v1';

// Keep account-deletion requests on Stripe's current stable API version.
const STRIPE_API_VERSION = '2026-07-29.dahlia';

const TERMINAL_SUBSCRIPTION_STATUSES = ['canceled', 'incomplete_expired'];

type StripeFetch = typeof fetch;

type CancelSubscriptionArgs = {
  subscriptionId: string;
  secretKey: string;
  fetcher?: StripeFetch;
};

export type StripeCustomerReference = {
  parameter: 'customer' | 'customer_account';
  id: string;
};

export const resolveStripeCustomerReference = (
  customerId: string | null | undefined,
): StripeCustomerReference | null => {
  if (!customerId) {
    return null;
  }
  if (customerId.startsWith('cus_')) {
    return { parameter: 'customer', id: customerId };
  }
  if (customerId.startsWith('acct_')) {
    return { parameter: 'customer_account', id: customerId };
  }

  return null;
};

export const shouldCancelStripeSubscription = (status: string): boolean => {
  return !TERMINAL_SUBSCRIPTION_STATUSES.includes(status);
};

// Cancellation is retriable across partial account-deletion attempts. If a
// previous request reached Stripe but failed before deleting the auth user,
// Stripe can reject the repeated DELETE; a follow-up read proves whether the
// subscription is already canceled before the account deletion may continue.
export const cancelStripeSubscription = async ({
  subscriptionId,
  secretKey,
  fetcher = fetch,
}: CancelSubscriptionArgs): Promise<void> => {
  if (!subscriptionId.startsWith('sub_')) {
    throw new Error('Invalid Stripe subscription id');
  }

  const url = `${STRIPE_API_BASE}/subscriptions/${subscriptionId}`;
  const headers = stripeHeaders(secretKey);
  const response = await fetcher(url, { method: 'DELETE', headers });
  if (response.ok) {
    return;
  }

  const verification = await fetcher(url, { method: 'GET', headers });
  if (verification.ok) {
    const body = (await verification.json()) as unknown;
    if (isCanceledSubscription(body)) {
      return;
    }
  }

  throw new Error(`Stripe cancellation failed with status ${response.status}`);
};

type ListLiveSubscriptionsArgs = {
  customerReference: StripeCustomerReference;
  secretKey: string;
  fetcher?: StripeFetch;
};

// A customer page holds at most 100; ten pages is far past anyone's history
// and keeps a malformed has_more from looping forever.
const MAX_LIST_PAGES = 10;

// Every subscription Stripe could still charge this customer for, not only the
// one the subscriptions row points at. The row is one-per-user, so a second
// subscription opened beside an unpaid or paused one is invisible to it, and
// deleting the account would leave that one billing a person with no account.
//
// Null when Stripe rejects the query itself (400): that is permanent, and it
// must not block deletion forever — the caller still cancels the known one.
// Any other failure throws, so a transient outage keeps the account intact
// and the deletion retryable.
export const listLiveStripeSubscriptions = async ({
  customerReference,
  secretKey,
  fetcher = fetch,
}: ListLiveSubscriptionsArgs): Promise<string[] | null> => {
  const liveIds: string[] = [];
  let startingAfter: string | null = null;

  for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
    const response = await fetcher(
      buildListUrl(customerReference, startingAfter),
      { method: 'GET', headers: stripeHeaders(secretKey) },
    );
    if (response.status === 400) {
      return null;
    }
    if (!response.ok) {
      throw new Error(
        `Stripe subscription listing failed with status ${response.status}`,
      );
    }

    const { subscriptions, hasMore } = readSubscriptionPage(
      await response.json(),
    );
    liveIds.push(
      ...subscriptions
        .filter((subscription) =>
          shouldCancelStripeSubscription(subscription.status),
        )
        .map((subscription) => subscription.id),
    );

    const last = subscriptions[subscriptions.length - 1];
    if (!hasMore || !last) {
      return liveIds;
    }
    startingAfter = last.id;
  }

  return liveIds;
};

// --- Helpers ---

type ListedSubscription = { id: string; status: string };

const buildListUrl = (
  customerReference: StripeCustomerReference,
  startingAfter: string | null,
): string => {
  const params = new URLSearchParams({ status: 'all', limit: '100' });
  params.set(customerReference.parameter, customerReference.id);
  if (startingAfter) {
    params.set('starting_after', startingAfter);
  }

  return `${STRIPE_API_BASE}/subscriptions?${params}`;
};

const readSubscriptionPage = (
  body: unknown,
): { subscriptions: ListedSubscription[]; hasMore: boolean } => {
  if (!body || typeof body !== 'object' || !('data' in body)) {
    throw new Error('Unexpected Stripe subscription list payload');
  }

  const { data } = body as { data: unknown };
  if (!Array.isArray(data)) {
    throw new Error('Unexpected Stripe subscription list payload');
  }

  const subscriptions = data.filter(isListedSubscription);
  const hasMore = 'has_more' in body && body.has_more === true;

  return { subscriptions, hasMore };
};

const isListedSubscription = (value: unknown): value is ListedSubscription => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { id?: unknown; status?: unknown };

  return (
    typeof candidate.id === 'string' &&
    candidate.id.startsWith('sub_') &&
    typeof candidate.status === 'string'
  );
};

const stripeHeaders = (secretKey: string): HeadersInit => ({
  Authorization: `Bearer ${secretKey}`,
  'Stripe-Version': STRIPE_API_VERSION,
});

const isCanceledSubscription = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'status' in value && value.status === 'canceled';
};
