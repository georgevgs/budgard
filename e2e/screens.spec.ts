import { E2E_USER_ID, test } from './fixtures/test';

// Not an assertion suite — a contact sheet. Run it to look at every screen in
// one pass after a visual change:
//
//   npx playwright test e2e/screens.spec.ts
//
// and open test-results/screens/. It asserts nothing on purpose: the point is
// a human (or a model that can see) looking at the result, which is the only
// way a layout regression gets caught. Gitignored output.
const SHOTS = 'test-results/screens';

const seed = (data: Record<string, Record<string, unknown>[]>) => {
  data.expenses.push(
    ...Array.from({ length: 8 }, (_, index) => ({
      id: `seed-${index}`,
      user_id: E2E_USER_ID,
      amount: 12 + index * 7,
      description: `Sample expense ${index + 1}`,
      date: new Date(Date.now() - index * 86400000).toISOString().slice(0, 10),
      category_id: index % 2 === 0 ? 'cat-groceries' : 'cat-transport',
      type: 'expense',
      created_at: new Date().toISOString(),
    })),
  );
  data.recurring_expenses.push({
    id: 'rec-1',
    user_id: E2E_USER_ID,
    // `getRecurringExpenses` filters on `.eq('type', 'expense')`, so a seeded
    // row without one is invisible to the app — which is why this contact
    // sheet showed an empty Recurring screen and a zeroed commitments card on
    // Plan for the whole redesign.
    type: 'expense',
    description: 'Internet',
    amount: 39,
    frequency: 'monthly',
    start_date: new Date().toISOString().slice(0, 10),
    next_due_date: new Date(Date.now() + 2 * 86400000)
      .toISOString()
      .slice(0, 10),
    active: true,
    category_id: 'cat-transport',
    created_at: new Date().toISOString(),
  });
  data.recurring_expenses.push({
    id: 'rec-income-1',
    user_id: E2E_USER_ID,
    type: 'income',
    description: 'Monthly salary',
    amount: 2400,
    frequency: 'monthly',
    start_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    active: true,
    category_id: 'cat-salary',
    created_at: new Date().toISOString(),
  });
};

const ROUTES = [
  ['today', '/today'],
  ['activity', '/activity'],
  ['plan', '/plan'],
  ['trends', '/trends'],
  ['trends-explore', '/trends/explore'],
  ['recurring', '/recurring'],
  ['networth', '/networth'],
  ['debts', '/debts'],
  ['settings', '/settings'],
  ['goals', '/goals'],
  ['transaction', '/t/exp-1'],
] as const;

// The flow toggle lives inside CashFlowSection, which only renders for a Pro
// subscriber.
const PRO_SUBSCRIPTION = {
  id: 'sub-1',
  status: 'active',
  current_period_end: new Date(Date.now() + 86_400_000 * 30).toISOString(),
  cancel_at_period_end: false,
};

const openMoneyFlow = async (app: import('@playwright/test').Page) => {
  await app.goto('/trends');
  await app.waitForTimeout(1500);
  await app
    .getByRole('tab', { name: 'This month' })
    .click();
  await app.waitForTimeout(500);
};

test('screenshot landing', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOTS}/landing.png` });
});

for (const [name, path] of ROUTES) {
  test(`screenshot ${name}`, async ({ app, data }) => {
    seed(data);
    await app.goto(path);
    await app.waitForTimeout(2500);
    await app.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  });
}

test('screenshot today-arrange', async ({ app, data }) => {
  seed(data);
  await app.goto('/today');
  await app.waitForTimeout(2000);
  await app.getByRole('button', { name: /arrange/i }).click();
  await app.waitForTimeout(600);
  await app.screenshot({ path: `${SHOTS}/today-arrange.png`, fullPage: true });
});

test('screenshot quick-add', async ({ app, data }) => {
  seed(data);
  await app.goto('/today');
  await app.waitForTimeout(2000);
  await app.getByRole('button', { name: /open actions menu/i }).click();
  await app.getByRole('button', { name: /add expense/i }).click();
  await app.waitForTimeout(900);
  await app.screenshot({ path: `${SHOTS}/quick-add.png` });
});

test('screenshot today-dark', async ({ app, data }) => {
  seed(data);
  await app.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await app.goto('/today');
  await app.waitForTimeout(2500);
  await app.screenshot({ path: `${SHOTS}/today-dark.png`, fullPage: true });
});

test('screenshot today-empty-grid', async ({ app, data }) => {
  seed(data);
  await app.addInitScript(() => {
    // Every tile hidden — reachable with ten taps in Arrange.
    localStorage.setItem(
      'today-layout',
      JSON.stringify({
        visible: [],
        hidden: [
          'safeToSpend',
          'budgetUsed',
          'monthPace',
          'upcoming',
          'topCategory',
          'insight',
          'recentActivity',
          'weeklyRecap',
          'netWorth',
          'debts',
        ],
      }),
    );
  });
  await app.goto('/today');
  await app.waitForTimeout(2000);
  await app.screenshot({
    path: `${SHOTS}/today-empty-grid.png`,
    fullPage: true,
  });
});

test('screenshot moneyflow', async ({ app, data }) => {
  data.subscriptions.push(PRO_SUBSCRIPTION);
  await openMoneyFlow(app);
  await app.screenshot({ path: `${SHOTS}/moneyflow.png`, fullPage: true });
});

test('screenshot moneyflow-deficit', async ({ app, data }) => {
  data.subscriptions.push(PRO_SUBSCRIPTION);
  data.expenses.push({
    id: 'deficit-rent',
    user_id: E2E_USER_ID,
    amount: 3200,
    description: 'Rent',
    date: new Date().toISOString().slice(0, 10),
    category_id: 'cat-transport',
    type: 'expense',
    created_at: new Date().toISOString(),
  });
  await openMoneyFlow(app);
  await app.screenshot({
    path: `${SHOTS}/moneyflow-deficit.png`,
    fullPage: true,
  });
});

test('screenshot moneyflow-color-collision', async ({ app, data }) => {
  data.subscriptions.push(PRO_SUBSCRIPTION);
  // Three categories that all picked the same swatch — a real, common case
  // given the picker only offers so many colours.
  data.categories.push(
    { id: 'cat-dining', user_id: E2E_USER_ID, name: 'Dining', color: '#ff8300', icon: '🍽️', type: 'expense' },
    { id: 'cat-shopping', user_id: E2E_USER_ID, name: 'Shopping', color: '#ff8300', icon: '🛍️', type: 'expense' },
  );
  data.expenses.push(
    { id: 'cc-1', user_id: E2E_USER_ID, amount: 180, description: 'Dinner out', date: new Date().toISOString().slice(0, 10), category_id: 'cat-dining', type: 'expense', created_at: new Date().toISOString() },
    { id: 'cc-2', user_id: E2E_USER_ID, amount: 260, description: 'New shoes', date: new Date().toISOString().slice(0, 10), category_id: 'cat-shopping', type: 'expense', created_at: new Date().toISOString() },
  );
  await openMoneyFlow(app);
  await app.screenshot({
    path: `${SHOTS}/moneyflow-color-collision.png`,
    fullPage: true,
  });
});

test('screenshot settings-data-export', async ({ app, data }) => {
  data.subscriptions.push(PRO_SUBSCRIPTION);
  await app.goto('/settings/data');
  await app.waitForTimeout(1500);
  await app.screenshot({
    path: `${SHOTS}/settings-data-export.png`,
    fullPage: true,
  });
});

test('screenshot cashflow-pro-trend', async ({ app, data }) => {
  data.subscriptions.push(PRO_SUBSCRIPTION);
  data.expenses.push(
    { id: 'ct-1', user_id: E2E_USER_ID, amount: 900, description: 'Rent', date: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 3).toISOString().slice(0, 10), category_id: 'cat-transport', type: 'expense', created_at: new Date().toISOString() },
    { id: 'ct-2', user_id: E2E_USER_ID, amount: 2600, description: 'Paycheck', date: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10), category_id: 'cat-salary', type: 'income', created_at: new Date().toISOString() },
    { id: 'ct-3', user_id: E2E_USER_ID, amount: 2500, description: 'Paycheck', date: new Date().toISOString().slice(0, 10), category_id: 'cat-salary', type: 'income', created_at: new Date().toISOString() },
  );
  await app.goto('/trends');
  await app.waitForTimeout(1800);
  await app.screenshot({ path: `${SHOTS}/cashflow-pro-trend.png`, fullPage: true });
});
