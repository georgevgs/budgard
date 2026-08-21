import { test, expect } from './fixtures/test';

// The journeys that decide whether the app opens at all. A failure here means
// nobody can use Budgard, so they run first and fastest.
test.describe('boot', () => {
  test('a signed-out visitor lands on the marketing page', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1 }),
    ).toBeVisible();
    await expect(page).toHaveURL('/');
  });

  test('a signed-in user lands on Today with their data', async ({ app }) => {
    await app.goto('/today');

    await expect(app).toHaveURL(/\/today$/);
    await expect(app.getByRole('navigation')).toBeVisible();
    // The seeded expense is on the recent list.
    await expect(app.getByText('Weekly shop')).toBeVisible();
  });

  test('every bottom-nav tab opens', async ({ app }) => {
    await app.goto('/today');
    const nav = app.getByRole('navigation');

    for (const path of ['/activity', '/plan', '/trends']) {
      await nav.getByRole('link', { name: new RegExp(labelFor(path), 'i') }).click();
      await expect(app).toHaveURL(new RegExp(`${path}$`));
    }
  });

  test('a deep link from a push notification still resolves', async ({ app }) => {
    // /expenses was renamed to /today; installed notifications still point at it.
    await app.goto('/expenses');

    await expect(app).toHaveURL(/\/today$/);
  });
});

// --- Helpers ---

const labelFor = (path: string): string => {
  if (path === '/activity') {
    return 'activity';
  }
  if (path === '/plan') {
    return 'plan';
  }

  return 'trends';
};
