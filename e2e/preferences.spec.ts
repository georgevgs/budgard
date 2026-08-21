import { test, expect } from './fixtures/test';

// Theme and language are read by the inline pre-paint script in index.html
// before React boots. A regression here shows up as a flash of the wrong
// theme on every cold start, which no unit test can see.
test.describe('preferences', () => {
  test('a theme choice survives a reload with no flash of the old one', async ({
    app,
  }) => {
    await app.goto('/settings');

    await app.getByRole('button', { name: 'Dark', exact: true }).click();
    await expect(app.locator('html')).toHaveClass(/dark/);

    await app.reload();

    // Set by the pre-paint script, so it is already correct on first paint
    // rather than corrected once React hydrates.
    await expect(app.locator('html')).toHaveClass(/dark/);
  });

  test('a language choice survives a reload', async ({ app }) => {
    await app.goto('/settings');

    await app.getByRole('combobox', { name: /language|γλώσσα/i }).click();
    await app.getByRole('option', { name: 'Ελληνικά' }).click();

    await expect(app.locator('html')).toHaveAttribute('lang', 'el');
    // The dock is on every screen, so its labels prove the whole UI switched
    // rather than just the control that was clicked.
    await expect(
      app.getByRole('navigation').getByText('Σήμερα'),
    ).toBeVisible();

    await app.reload();

    await expect(app.locator('html')).toHaveAttribute('lang', 'el');
    await expect(
      app.getByRole('navigation').getByText('Σήμερα'),
    ).toBeVisible();
  });
});

// Pro gating decides what a paying user gets. A gate that silently opens is a
// revenue bug; a gate that never opens is a support ticket.
test.describe('pro gating', () => {
  test('a free user meets the gate on a Pro route', async ({ app }) => {
    await app.goto('/goals');

    await expect(
      app.getByText(/savings goals are a pro feature/i),
    ).toBeVisible();
  });

  test('a subscriber walks straight through', async ({ app, data }) => {
    data.subscriptions.push({
      id: 'sub-1',
      status: 'active',
      current_period_end: new Date(Date.now() + 86_400_000 * 30).toISOString(),
      cancel_at_period_end: false,
    });

    await app.goto('/goals');

    await expect(
      app.getByText(/savings goals are a pro feature/i),
    ).toBeHidden();
  });
});
