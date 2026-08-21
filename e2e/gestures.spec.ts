import { test, expect } from './fixtures/test';

// Pull-to-refresh is wired with native non-passive listeners, because React
// registers touchmove as passive at the root and a passive listener cannot
// preventDefault. Nothing but a real touch sequence in a real browser proves
// that plumbing works.
test.describe('pull to refresh', () => {
  test('a pull at the top of Today refetches', async ({ app, data }) => {
    await app.goto('/today');
    await expect(app.getByText('Weekly shop')).toBeVisible();

    // Something new arrives on the server that the app has not seen yet.
    data.expenses.push({
      id: 'exp-late',
      amount: 9.9,
      description: 'Added on the server',
      date: new Date().toISOString().slice(0, 10),
      category_id: 'cat-groceries',
      type: 'expense',
      user_id: '11111111-1111-4111-8111-111111111111',
      created_at: new Date().toISOString(),
    });
    await expect(app.getByText('Added on the server')).toBeHidden();

    await pullDown(app, 140);

    await expect(app.getByText('Added on the server')).toBeVisible();
  });

  // MainTabsLayout keeps every visited tab mounted, so a per-view gesture hook
  // would leave one document listener per tab and a single pull would refetch
  // once for each. The gesture lives in the shell for exactly this reason.
  test('pulls once even after every tab has been visited', async ({ app }) => {
    const refetches: string[] = [];
    app.on('request', (request) => {
      if (request.url().includes('/rest/v1/expenses') && request.method() === 'GET') {
        refetches.push(request.url());
      }
    });

    await app.goto('/today');
    const nav = app.getByRole('navigation');
    for (const tab of [/activity/i, /plan/i, /trends/i, /today/i]) {
      await nav.getByRole('link', { name: tab }).click();
    }
    await expect(app).toHaveURL(/\/today$/);
    await app.waitForTimeout(500);

    const before = refetches.length;
    await pullDown(app, 200);
    await app.waitForTimeout(1200);

    // A two-stage fetch issues a recent-window read and a history top-up, so
    // the count is per refresh, not per request. What matters is that one pull
    // does not multiply by the number of live tabs.
    expect(refetches.length - before).toBeLessThanOrEqual(2);
    expect(refetches.length).toBeGreaterThan(before);
  });

  test('a short pull does not refetch', async ({ app, data }) => {
    await app.goto('/today');
    await expect(app.getByText('Weekly shop')).toBeVisible();

    data.expenses.push({
      id: 'exp-late-2',
      amount: 4,
      description: 'Should stay hidden',
      date: new Date().toISOString().slice(0, 10),
      category_id: 'cat-groceries',
      type: 'expense',
      user_id: '11111111-1111-4111-8111-111111111111',
      created_at: new Date().toISOString(),
    });

    // Well under the trigger distance once resistance is applied.
    await pullDown(app, 30);
    await app.waitForTimeout(500);

    await expect(app.getByText('Should stay hidden')).toBeHidden();
  });
});

// --- Helpers ---

// Playwright's touchscreen API only taps, so the drag is dispatched directly.
const pullDown = async (
  page: import('@playwright/test').Page,
  distance: number,
) => {
  await page.evaluate(async (total) => {
    const touch = (y: number) =>
      new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [
          new Touch({ identifier: 1, target: document.body, clientY: y, clientX: 100 }),
        ],
      });
    const move = (y: number) =>
      new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [
          new Touch({ identifier: 1, target: document.body, clientY: y, clientX: 100 }),
        ],
      });

    window.scrollTo(0, 0);
    document.dispatchEvent(touch(80));
    // Several steps, the way a finger actually moves — a single jump would
    // not exercise the resistance curve.
    for (let step = 1; step <= 6; step += 1) {
      document.dispatchEvent(move(80 + (total / 6) * step));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    document.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
  }, distance);
};
