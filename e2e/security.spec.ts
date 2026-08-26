import { test, expect } from './fixtures/test';

const PIN = '1379';

// A lock nobody can set, or that nobody can get past, is worse than no lock.
// These cover both directions, plus the one that is easy to get wrong: an
// overlay that hides the app from the eye but not from the keyboard.
test.describe('app lock', () => {
  const enterPin = async (
    page: import('@playwright/test').Page,
    digits: string,
  ) => {
    for (const digit of digits) {
      await page.getByRole('button', { name: digit, exact: true }).click();
    }
  };

  // Deriving the stored hash is deliberately slow, so the toast is the signal
  // that it actually landed. Reloading before it does races the write.
  const enableLock = async (page: import('@playwright/test').Page) => {
    await page.goto('/settings/notifications');
    await page
      .getByRole('switch', { name: /lock budgard with a pin/i })
      .click();
    await expect(page.getByText(/choose a pin/i)).toBeVisible();
    await enterPin(page, PIN);
    await expect(page.getByText(/enter it again/i)).toBeVisible();
    await enterPin(page, PIN);
    await expect(page.getByText(/app lock is on/i)).toBeVisible();
  };

  test('guards the app after a reload, and opens with the right pin', async ({
    app,
  }) => {
    await enableLock(app);

    await app.reload();
    await expect(app.getByText(/enter your pin/i)).toBeVisible();

    await enterPin(app, PIN);

    await expect(
      app.getByRole('heading', { name: 'Notifications & security' }),
    ).toBeVisible();
  });

  // Covered is not enough. A fixed overlay leaves the app behind it in the tab
  // order, so a keyboard user could walk straight past the lock into the
  // account it is supposed to be guarding.
  test('puts the app behind it out of reach of the keyboard', async ({
    app,
  }) => {
    await enableLock(app);
    await app.reload();
    await expect(app.getByText(/enter your pin/i)).toBeVisible();

    await expect(app.locator('[inert]')).toHaveCount(1);

    // Tab repeatedly; focus must never escape the lock screen.
    for (let press = 0; press < 12; press += 1) {
      await app.keyboard.press('Tab');
      const insideLock = await app.evaluate(() =>
        Boolean(document.activeElement?.closest('[role="dialog"]')),
      );
      expect(insideLock).toBe(true);
    }

    await enterPin(app, PIN);
    await expect(app.locator('[inert]')).toHaveCount(0);
  });

  test('rejects the wrong pin and says how many tries are left', async ({
    app,
  }) => {
    await enableLock(app);
    await app.reload();
    await expect(app.getByText(/enter your pin/i)).toBeVisible();

    await enterPin(app, '0000');

    await expect(app.getByText(/wrong pin/i)).toBeVisible();
    await expect(app.getByText(/enter your pin/i)).toBeVisible();
  });

  test('a mistyped confirmation starts over instead of saving', async ({
    app,
  }) => {
    await app.goto('/settings/notifications');
    await app.getByRole('switch', { name: /lock budgard with a pin/i }).click();

    await enterPin(app, PIN);
    await enterPin(app, '2468');

    await expect(app.getByText(/did not match/i)).toBeVisible();
    await expect(app.getByText(/choose a pin/i)).toBeVisible();
  });

  // Forgetting the PIN must never mean losing the account.
  test('signing out is always a way past the lock', async ({ app }) => {
    await enableLock(app);
    await app.reload();
    await expect(app.getByText(/enter your pin/i)).toBeVisible();

    await expect(
      app.getByRole('button', { name: /sign out instead/i }),
    ).toBeVisible();
  });
});
