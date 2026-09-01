import { test, expect } from './fixtures/test';

// The Today grid is the one screen whose layout is user state rather than
// ours, so the things worth pinning are: a hide sticks, it survives a reload,
// and there is always a way back to the default.
test.describe('arranging the Today grid', () => {
  test('hides a module, and the hide survives a reload', async ({ app }) => {
    await app.goto('/today');
    await expect(app.getByText('Safe to spend')).toBeVisible();

    await app.getByRole('button', { name: /arrange your grid/i }).click();
    await app.getByRole('button', { name: /hide safe to spend/i }).click();
    await app.getByRole('button', { name: /^done$/i }).click();

    await expect(app.getByText('Safe to spend')).toBeHidden();

    await app.reload();
    await expect(app.getByText('Recent activity')).toBeVisible();
    await expect(app.getByText('Safe to spend')).toBeHidden();
  });

  test('a hidden module can be brought back', async ({ app }) => {
    await app.goto('/today');
    await app.getByRole('button', { name: /arrange your grid/i }).click();
    await app.getByRole('button', { name: /hide safe to spend/i }).click();
    const showButton = app.getByRole('button', { name: /show safe to spend/i });
    await expect(showButton).toBeVisible();
    await expect(showButton).toBeFocused();
    await expect(
      app.getByRole('status').filter({ hasText: /safe to spend hidden/i }),
    ).toHaveText(/safe to spend hidden/i);

    await showButton.click();
    await expect(
      app.getByRole('button', { name: /hide safe to spend/i }),
    ).toBeFocused();
    await expect(
      app.getByRole('status').filter({ hasText: /safe to spend shown/i }),
    ).toHaveText(/safe to spend shown/i);
    await app.getByRole('button', { name: /^done$/i }).click();

    await expect(app.getByText('Safe to spend')).toBeVisible();
  });

  test('reorders modules and keeps the order after reload', async ({ app }) => {
    await app.goto('/today');
    await app.getByRole('button', { name: /arrange your grid/i }).click();
    await app
      .getByRole('button', { name: /move next 7 days earlier/i })
      .click();

    await expect(
      app
        .getByRole('status')
        .filter({ hasText: /next 7 days moved to position 1/i }),
    ).toHaveText(/next 7 days moved to position 1/i);
    await expect
      .poll(async () => (await readVisibleOrder(app)).slice(0, 2))
      .toEqual(['upcoming', 'safeToSpend']);

    await app.reload();
    expect((await readVisibleOrder(app)).slice(0, 2)).toEqual([
      'upcoming',
      'safeToSpend',
    ]);
  });

  // Reachable: ten taps on − and the screen is blank. The way out has to be
  // on the blank screen itself, not only in the header.
  test('hiding everything leaves a way back', async ({ app }) => {
    // Every id has to be listed. A tile in neither list is treated as one this
    // build just added and placed by its default — which is the behaviour that
    // lets a later release ship a new module without it looking user-hidden.
    await app.addInitScript(() => {
      localStorage.setItem(
        'today-layout',
        JSON.stringify({
          visible: [],
          hidden: [
            'safeToSpend', 'budgetUsed', 'monthPace', 'upcoming',
            'topCategory', 'insight', 'recentActivity', 'weeklyRecap',
            'netWorth', 'debts',
          ],
        }),
      );
    });
    await app.goto('/today');

    await expect(app.getByText(/your grid is empty/i)).toBeVisible();
    await app.getByRole('button', { name: /arrange your grid/i }).last().click();
    await app.getByRole('button', { name: /reset to default/i }).click();
    await app.getByRole('button', { name: /^done$/i }).click();

    await expect(app.getByText('Safe to spend')).toBeVisible();
  });
});

// localStorage is the feature's persistence boundary. Reading it here pins
// the exact order independently of which data-dependent tiles render today.
const readVisibleOrder = async (
  page: import('@playwright/test').Page,
): Promise<string[]> =>
  page.evaluate(() => {
    const raw = localStorage.getItem('today-layout');
    if (!raw) {

      return [];
    }

    const stored = JSON.parse(raw) as { visible?: string[] };

    return stored.visible ?? [];
  });
