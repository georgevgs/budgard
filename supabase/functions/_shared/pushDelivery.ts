export const PUSH_SUBSCRIPTION_LIMIT = 10;

export type PushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type SendNotification = (
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
  payload: string,
  options: { timeout: number },
) => Promise<unknown>;

// Keep this boundary aligned with the database constraint. Matching the raw
// authority rejects credentials, alternate ports and URL-parser normalization
// tricks before the privileged worker can make an outbound request.
const PUSH_ENDPOINT =
  /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)\/[A-Za-z0-9/_~.%?=&+:-]+$/;

export const isAllowedPushSubscription = (
  subscription: PushSubscription,
): boolean => {
  return (
    subscription.endpoint.length <= 2048 &&
    !/\s/.test(subscription.endpoint) &&
    !/\s/.test(subscription.p256dh + subscription.auth) &&
    PUSH_ENDPOINT.test(subscription.endpoint) &&
    /^[A-Za-z0-9_-]{87}=?$/.test(subscription.p256dh) &&
    /^[A-Za-z0-9_-]{22}(==)?$/.test(subscription.auth)
  );
};

export const deliverPush = async (
  subscription: PushSubscription,
  payload: string,
  sendNotification: SendNotification,
): Promise<'sent' | 'failed' | 'stale' | 'blocked'> => {
  if (!isAllowedPushSubscription(subscription)) {
    return 'blocked';
  }

  try {
    await sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload,
      { timeout: 5000 },
    );

    return 'sent';
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number } | null)?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      return 'stale';
    }

    return 'failed';
  }
};
