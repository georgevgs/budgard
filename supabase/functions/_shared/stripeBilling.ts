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

// --- Helpers ---

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
