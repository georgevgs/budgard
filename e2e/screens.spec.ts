import { seed } from './fixtures/screensSeed';
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
const TODAY_LAYOUT_KEY = `today-layout:${E2E_USER_ID}`;

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

test('screenshot activity-first-use', async ({ app, data }) => {
  data.expenses.length = 0;
  await app.goto('/activity');
  await app.getByText('Your activity starts here').waitFor();
  await app.screenshot({
    path: `${SHOTS}/activity-first-use.png`,
    fullPage: true,
  });
});

test('screenshot activity-no-results', async ({ app, data }) => {
  seed(data);
  await app.goto('/activity');
  await app
    .getByRole('textbox', { name: 'Search activity' })
    .fill('No matching transaction');
  await app.screenshot({
    path: `${SHOTS}/activity-no-results.png`,
    fullPage: true,
  });
});

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

// Saving closes the sheet immediately (see QuickAddSheet) — the toast that
// follows is the only confirmation left on screen, so it is what this shot
// captures: the saved amount + name, and the Undo action beside it.
test('screenshot quick-add-saved', async ({ app, data }) => {
  seed(data);
  await app.goto('/today');
  await app.waitForTimeout(2000);
  await app.getByRole('button', { name: /open actions menu/i }).click();
  await app.getByRole('button', { name: /add expense/i }).click();
  await app.waitForTimeout(900);
  await app
    .getByLabel('Description (optional)', { exact: true })
    .fill('Coffee run');
  await app.getByRole('button', { name: '1', exact: true }).click();
  await app.getByRole('button', { name: '2', exact: true }).click();
  await app.getByRole('button', { name: '0', exact: true }).click();
  await app.getByRole('button', { name: '0', exact: true }).click();
  await app.getByRole('button', { name: 'Save' }).click();
  await app.waitForTimeout(500);
  await app.screenshot({ path: `${SHOTS}/quick-add-saved.png` });
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
  await app.addInitScript((storageKey) => {
    // Every tile hidden — reachable with ten taps in Arrange.
    localStorage.setItem(
      storageKey,
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
  }, TODAY_LAYOUT_KEY);
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
    { id: 'ct-1', user_id: E2E_USER_ID, amount: 900, description: 'Rent', date: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth() - 1, 3)).toISOString().slice(0, 10), category_id: 'cat-transport', type: 'expense', created_at: new Date().toISOString() },
    { id: 'ct-2', user_id: E2E_USER_ID, amount: 2600, description: 'Paycheck', date: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth() - 1, 1)).toISOString().slice(0, 10), category_id: 'cat-salary', type: 'income', created_at: new Date().toISOString() },
    { id: 'ct-3', user_id: E2E_USER_ID, amount: 2500, description: 'Paycheck', date: new Date().toISOString().slice(0, 10), category_id: 'cat-salary', type: 'income', created_at: new Date().toISOString() },
  );
  await app.goto('/trends');
  await app.waitForTimeout(1800);
  await app.screenshot({ path: `${SHOTS}/cashflow-pro-trend.png`, fullPage: true });
});
