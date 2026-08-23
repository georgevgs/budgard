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
    next_due_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    active: true,
    category_id: 'cat-transport',
    created_at: new Date().toISOString(),
  });
};

const ROUTES = [
  ['today', '/today'],
  ['activity', '/activity'],
  ['plan', '/plan'],
  ['trends', '/trends'],
  ['recurring', '/recurring'],
  ['networth', '/networth'],
  ['debts', '/debts'],
  ['settings', '/settings'],
  ['goals', '/goals'],
  ['transaction', '/t/exp-1'],
] as const;

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
          'safeToSpend', 'budgetUsed', 'monthPace', 'upcoming', 'topCategory',
          'insight', 'recentActivity', 'weeklyRecap', 'netWorth', 'debts',
        ],
      }),
    );
  });
  await app.goto('/today');
  await app.waitForTimeout(2000);
  await app.screenshot({ path: `${SHOTS}/today-empty-grid.png`, fullPage: true });
});
