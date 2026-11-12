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

// PostgREST caps every response at this many rows (max_rows in config.toml).
// A read that can outgrow it pages until a short page arrives, otherwise the
// rows past the cap vanish without an error.
const PAGE_SIZE = 1000;

type PageResult<Row> = { data: Row[] | null; error: unknown };

type ReadPage<Row> = (from: number, to: number) => PromiseLike<PageResult<Row>>;

// The query behind readPage must carry a stable order, range pagination over
// an unordered result can repeat or skip rows between pages.
export const readAllPages = <Row>(
  label: string,
  readPage: ReadPage<Row>,
): Promise<PageResult<Row>> => {
  return collectPages(label, readPage, []);
};

// Runs the tasks with at most `size` in flight and keeps the input order.
// Every worker pulls from one shared iterator, so no item is taken twice.
export const runPool = async <Item, Result>(
  items: Item[],
  size: number,
  run: (item: Item) => Promise<Result>,
): Promise<Result[]> => {
  const results = new Array<Result>(items.length);
  const entries = items.entries();
  const work = async (): Promise<void> => {
    for (const [index, item] of entries) {
      results[index] = await run(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, work));

  return results;
};

const collectPages = async <Row>(
  label: string,
  readPage: ReadPage<Row>,
  collected: Row[],
): Promise<PageResult<Row>> => {
  const { data, error } = await readPage(
    collected.length,
    collected.length + PAGE_SIZE - 1,
  );
  if (null !== error || null === data) {
    console.error(`push batch: reading ${label} failed:`, error);

    return { data: null, error };
  } else if (data.length < PAGE_SIZE) {
    return { data: [...collected, ...data], error: null };
  } else {
    return collectPages(label, readPage, [...collected, ...data]);
  }
};
