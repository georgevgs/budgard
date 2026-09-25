// Sentry records whole URLs: the page an error happened on, every fetch in a
// trace, every navigation breadcrumb. In this app the query string is where
// the sensitive part lives — a household invite token (`/join?token=…`) and
// PostgREST filters that name ids, dates and amounts. The path says what
// happened; the query says to whom. Only the path is sent.

type UrlBag = Record<string, unknown>;

type ScrubbableRequest = {
  url?: string;
  query_string?: unknown;
  headers?: Record<string, string>;
};

type ScrubbableSpan = { description?: string; data?: UrlBag };

type ScrubbableBreadcrumb = { data?: UrlBag };

type ScrubbableEvent = {
  transaction?: string;
  request?: ScrubbableRequest;
  breadcrumbs?: ScrubbableBreadcrumb[];
  spans?: ScrubbableSpan[];
};

// Values that are a URL (or carry one) and keep their path.
const URL_KEYS = ['url', 'from', 'to', 'http.url', 'url.full'];
// Values that are nothing but the query or fragment, so they go entirely.
const QUERY_KEYS = ['http.query', 'http.fragment', 'url.query'];

// A plain cut rather than new URL(): it also handles relative paths and span
// descriptions shaped like "GET https://host/rest/v1/expenses?select=…".
export const scrubUrl = (value: string): string => {
  const cut = value.search(/[?#]/);
  if (cut === -1) {
    return value;
  }

  return value.slice(0, cut);
};

export const scrubEvent = <T extends ScrubbableEvent>(event: T): T => {
  const scrubbed: T = { ...event };
  if (typeof event.transaction === 'string') {
    scrubbed.transaction = scrubUrl(event.transaction);
  }
  if (event.request) {
    scrubbed.request = scrubRequest(event.request);
  }
  if (event.breadcrumbs) {
    scrubbed.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  }
  if (event.spans) {
    scrubbed.spans = event.spans.map(scrubSpan);
  }

  return scrubbed;
};

export const scrubBreadcrumb = <T extends ScrubbableBreadcrumb>(
  breadcrumb: T,
): T => {
  if (!breadcrumb.data) {
    return breadcrumb;
  }

  return { ...breadcrumb, data: scrubBag(breadcrumb.data) };
};

export const scrubSpan = <T extends ScrubbableSpan>(span: T): T => {
  const scrubbed: T = { ...span };
  if (typeof span.description === 'string') {
    scrubbed.description = scrubUrl(span.description);
  }
  if (span.data) {
    scrubbed.data = scrubBag(span.data);
  }

  return scrubbed;
};

const scrubRequest = (request: ScrubbableRequest): ScrubbableRequest => {
  const scrubbed: ScrubbableRequest = { ...request };
  delete scrubbed.query_string;
  if (typeof request.url === 'string') {
    scrubbed.url = scrubUrl(request.url);
  }
  if (request.headers) {
    scrubbed.headers = scrubHeaders(request.headers);
  }

  return scrubbed;
};

const scrubHeaders = (
  headers: Record<string, string>,
): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => {
      if (name.toLowerCase() === 'referer') {
        return [name, scrubUrl(value)];
      }

      return [name, value];
    }),
  );
};

const scrubBag = (bag: UrlBag): UrlBag => {
  return Object.fromEntries(
    Object.entries(bag)
      .filter(([key]) => !QUERY_KEYS.includes(key))
      .map(([key, value]) => {
        if (URL_KEYS.includes(key) && typeof value === 'string') {
          return [key, scrubUrl(value)];
        }

        return [key, value];
      }),
  );
};
