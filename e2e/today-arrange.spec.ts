import { test, expect } from './fixtures/test';

// The Today grid is the one screen whose layout is user state rather than
// ours, so the things worth pinning are: a hide sticks, it survives a reload,
// and there is always a way back to the default.
test.describe('arranging the Today grid', () => {
  test('hides a module, and the hide survives a reload', async ({ app }) => {
    await app.goto('/today');
    await expect(app.getByText('Budget used')).toBeVisible();

    await app.getByRole('button', { name: /arrange your grid/i }).click();
    await app.getByRole('button', { name: /hide budget used/i }).click();
    await app.getByRole('button', { name: /^done$/i }).click();

    await expect(app.getByText('Budget used')).toBeHidden();

    await app.reload();
    await expect(app.getByText('Safe to spend')).toBeVisible();
    await expect(app.getByText('Budget used')).toBeHidden();
  });

  test('a hidden module can be brought back', async ({ app }) => {
    await app.goto('/today');
    await app.getByRole('button', { name: /arrange your grid/i }).click();
    await app.getByRole('button', { name: /hide month pace/i }).click();
    await expect(
      app.getByRole('button', { name: /show month pace/i }),
    ).toBeVisible();

    await app.getByRole('button', { name: /show month pace/i }).click();
    await app.getByRole('button', { name: /^done$/i }).click();

    await expect(app.getByText('Month pace')).toBeVisible();
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
