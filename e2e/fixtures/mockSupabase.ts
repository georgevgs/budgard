import type { Page, Route } from '@playwright/test';

// A small in-memory PostgREST stand-in. It understands enough of the protocol
// for the app's real queries — select with filters, insert, update, delete,
// upsert, and the Prefer: return=representation header — so the suite exercises
// the actual dataService code path instead of a hand-stubbed service layer.

export const E2E_USER_ID = '11111111-1111-4111-8111-111111111111';
const E2E_EMAIL = 'e2e@budgard.test';

export type Dataset = Record<string, Record<string, unknown>[]>;

type BackendFailure = {
  status: number;
  body: {
    code: string;
    message: string;
  };
};

// Flipped by a test to make every REST call fail the way a dead network does,
// so the offline queue can be exercised without touching browser-level
// offline mode (which would also kill the intercepted routes).
export const backend: {
  reachable: boolean;
  nextFailure: BackendFailure | null;
} = {
  reachable: true,
  nextFailure: null,
};

export const buildDataset = (overrides: Partial<Dataset> = {}): Dataset => ({
  categories: [
    row({ id: 'cat-groceries', name: 'Groceries', color: '#ff8300', icon: '🛒', type: 'expense' }),
    row({ id: 'cat-transport', name: 'Transport', color: '#00a3ff', icon: '🚌', type: 'expense' }),
    row({ id: 'cat-salary', name: 'Salary', color: '#00c07f', icon: '💼', type: 'income' }),
  ],
  expenses: [
    row({
      id: 'exp-1',
      amount: 24.5,
      description: 'Weekly shop',
      date: today(),
      category_id: 'cat-groceries',
      type: 'expense',
    }),
    row({
      id: 'inc-1',
      amount: 2400,
      description: 'August salary',
      date: today(),
      category_id: 'cat-salary',
      type: 'income',
    }),
  ],
  user_budgets: [
    row({
      id: 'budget-1',
      monthly_amount: 1500,
      default_currency: 'EUR',
      default_savings_pct: null,
      daily_reminder_hour: null,
      notification_preferences: {},
    }),
  ],
  recurring_expenses: [],
  tags: [],
  expense_tags: [],
  expense_templates: [],
  category_budgets: [],
  accounts: [],
  account_balances: [],
  goals: [],
  debts: [],
  no_spend_days: [],
  subscriptions: [],
  ...overrides,
});

// Installs the interceptors. Returns the live dataset so a test can assert on
// what the app actually wrote, rather than only on what it rendered.
export const mockSupabase = async (
  page: Page,
  dataset: Dataset = buildDataset(),
): Promise<Dataset> => {
  await page.route('https://e2e.supabase.co/auth/v1/**', (route) =>
    handleAuth(route),
  );
  await page.route('https://e2e.supabase.co/rest/v1/**', (route) =>
    handleRest(route, dataset),
  );
  await page.route('https://e2e.supabase.co/storage/v1/**', (route) =>
    json(route, {}),
  );
  await page.route('https://e2e.supabase.co/functions/v1/**', (route) =>
    json(route, { url: 'https://checkout.stripe.test/session' }),
  );
  // Third-party scripts the app loads but which have nothing to do with the
  // behaviour under test. Blocked so the suite never depends on the network.
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }),
  );
  await page.route('https://static.cloudflareinsights.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }),
  );
  await page.route('https://*.sentry.io/**', (route) => json(route, {}));

  return dataset;
};

// Writes the session supabase-js looks for, so an authenticated test starts on
// the app rather than driving the sign-in form every time. The storage key is
// derived from the project ref in the URL, exactly as supabase-js derives it.
export const seedSession = async (page: Page): Promise<void> => {
  await page.addInitScript(
    ({ userId, email }) => {
      const oneHour = 60 * 60;
      const session = {
        access_token: 'e2e-access-token',
        refresh_token: 'e2e-refresh-token',
        token_type: 'bearer',
        expires_in: oneHour,
        expires_at: Math.floor(Date.now() / 1000) + oneHour,
        user: {
          id: userId,
          aud: 'authenticated',
          role: 'authenticated',
          email,
          app_metadata: { provider: 'email' },
          user_metadata: {},
          created_at: new Date(0).toISOString(),
        },
      };
      window.localStorage.setItem(
        'sb-e2e-auth-token',
        JSON.stringify(session),
      );
      // Skip the first-run flow; the onboarding journey clears this itself.
      window.localStorage.setItem('budgard_onboarded', 'true');
    },
    { userId: E2E_USER_ID, email: E2E_EMAIL },
  );
};

// --- Helpers ---

const today = (): string => new Date().toISOString().slice(0, 10);

const row = (fields: Record<string, unknown>): Record<string, unknown> => ({
  user_id: E2E_USER_ID,
  created_at: new Date().toISOString(),
  ...fields,
});

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });

const handleAuth = (route: Route) => {
  const url = route.request().url();

  if (url.includes('/logout')) {
    return json(route, {});
  }
  if (url.includes('/otp')) {
    return json(route, {});
  }

  return json(route, {
    access_token: 'e2e-access-token',
    refresh_token: 'e2e-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    user: { id: E2E_USER_ID, email: E2E_EMAIL, aud: 'authenticated' },
  });
};

const handleRest = async (route: Route, dataset: Dataset) => {
  if (!backend.reachable) {
    return route.abort('internetdisconnected');
  }

  const failure = backend.nextFailure;
  if (failure) {
    backend.nextFailure = null;

    return json(route, failure.body, failure.status);
  }

  const request = route.request();
  const url = new URL(request.url());
  const table = url.pathname.replace('/rest/v1/', '').split('/')[0];
  const rows = (dataset[table] ??= []);
  const method = request.method();
  // PostgREST returns a bare object rather than an array when the client asks
  // for one — which is what supabase-js `.single()` / `.maybeSingle()` set.
  // Getting this wrong hands `.single()` an array and the caller reads
  // properties off undefined, so it has to be honoured.
  const wantsObject = (request.headers()['accept'] ?? '').includes(
    'vnd.pgrst.object',
  );

  if (method === 'GET') {
    return respond(
      route,
      embedRelations(applyFilters(rows, url.searchParams), url, dataset),
      wantsObject,
    );
  }

  if (method === 'POST') {
    const payload = toArray(request.postDataJSON());
    const created = payload.map((item, index) => ({
      id: `${table}-${nextId(table, index)}`,
      user_id: E2E_USER_ID,
      created_at: new Date().toISOString(),
      ...tableDefaults(table),
      ...item,
    }));
    // An upsert re-sends a row that may already exist; replace in place so the
    // dataset never grows a duplicate the way a plain push would.
    created.forEach((item) => upsertRow(rows, item));

    return respond(route, created, wantsObject, 201);
  }

  if (method === 'PATCH') {
    const patch = request.postDataJSON() as Record<string, unknown>;
    const matched = applyFilters(rows, url.searchParams);
    matched.forEach((item) => Object.assign(item, patch));

    return respond(route, matched, wantsObject);
  }

  if (method === 'DELETE') {
    const matched = applyFilters(rows, url.searchParams);
    dataset[table] = rows.filter((item) => !matched.includes(item));

    return respond(route, matched, wantsObject);
  }

  return json(route, {});
};

let idCounter = 0;

const nextId = (table: string, index: number): string => {
  idCounter += 1;

  return `${idCounter}-${index}`;
};

// Postgres applies these defaults before returning an inserted row. Mirroring
// them matters after reload because the app's expense queries filter by type.
const tableDefaults = (table: string): Record<string, unknown> => {
  if (
    table === 'categories' ||
    table === 'expenses' ||
    table === 'recurring_expenses'
  ) {

    return { type: 'expense' };
  }

  return {};
};

const upsertRow = (
  rows: Record<string, unknown>[],
  item: Record<string, unknown>,
): void => {
  const existing = rows.findIndex((row) => row.id === item.id);
  if (existing >= 0) {
    rows[existing] = { ...rows[existing], ...item };

    return;
  }

  rows.push(item);
};

// PostgREST resolves `category:categories(...)` in a select into a nested
// object on each row; this mock returned the raw row and left it undefined, so
// every transaction in every screenshot and every test rendered as
// "Uncategorized" — which is exactly the state the row design is NOT built
// around. Only the category embed is modelled, because it is the only one the
// listing queries ask for.
const EMBED_PATTERN = /\bcategory:categories\(/;

const embedRelations = (
  rows: Record<string, unknown>[],
  url: URL,
  dataset: Dataset,
): Record<string, unknown>[] => {
  const select = url.searchParams.get('select') ?? '';
  if (!EMBED_PATTERN.test(select)) {
    return rows;
  }

  const categories = dataset.categories ?? [];

  return rows.map((row) => ({
    ...row,
    category: categories.find((item) => item.id === row.category_id) ?? null,
  }));
};

// `.maybeSingle()` on an empty result is not an error — PostgREST answers 406
// for `.single()` but supabase-js treats a null body as "no row" for both, so
// returning null is the shape that keeps the app on its happy path.
const respond = (
  route: Route,
  rows: Record<string, unknown>[],
  wantsObject: boolean,
  status = 200,
) => {
  if (!wantsObject) {
    return json(route, rows, status);
  }

  return json(route, rows[0] ?? null, status);
};

const toArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value as Record<string, unknown>[];
  }

  return [value as Record<string, unknown>];
};

// PostgREST encodes filters as `column=op.value`. Only the operators the app
// actually sends are implemented; anything else is treated as "no filter",
// which fails loudly in a test rather than silently returning the wrong rows.
const applyFilters = (
  rows: Record<string, unknown>[],
  params: URLSearchParams,
): Record<string, unknown>[] => {
  let result = [...rows];

  for (const [key, raw] of params.entries()) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(key)) {
      continue;
    }
    const [op, ...rest] = raw.split('.');
    const value = rest.join('.');
    result = result.filter((item) => matches(item[key], op, value));
  }

  return result;
};

const matches = (actual: unknown, op: string, value: string): boolean => {
  if (op === 'eq') {
    return String(actual) === value;
  }
  if (op === 'neq') {
    return String(actual) !== value;
  }
  if (op === 'gte') {
    return String(actual) >= value;
  }
  if (op === 'lte') {
    return String(actual) <= value;
  }
  if (op === 'lt') {
    return String(actual) < value;
  }
  if (op === 'gt') {
    return String(actual) > value;
  }
  if (op === 'is') {
    return actual === null;
  }
  if (op === 'in') {
    return value.replace(/[()"]/g, '').split(',').includes(String(actual));
  }

  return true;
};
