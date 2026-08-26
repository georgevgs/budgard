import { test, expect } from './fixtures/test';

const USER = '11111111-1111-4111-8111-111111111111';

// A list that stops at twenty rows behind a button is fine until someone has
// three years of history. These cover the mechanics that make it keep working.
test.describe('activity list', () => {
  test.beforeEach(async ({ data }) => {
    // All within the current month: Activity opens on "By month", so rows
    // dated further back would simply not be in the visible period.
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 60; i += 1) {
      data.expenses.push({
        id: `bulk-${i}`,
        amount: 5 + i,
        description: `Item ${i}`,
        date: today,
        category_id: 'cat-groceries',
        type: 'expense',
        user_id: USER,
        created_at: new Date(Date.now() - i * 1000).toISOString(),
      });
    }
  });

  test('extends itself as it is scrolled', async ({ app }) => {
    await app.goto('/activity');
    await expect(app.getByRole('link', { name: /open item 0/i })).toBeVisible();

    // Well past the first page of twenty.
    await expect(app.getByRole('link', { name: /open item 30/i })).toBeHidden();

    await app.mouse.wheel(0, 6000);

    await expect(app.getByRole('link', { name: /open item 30/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  // Off-screen groups must stay in the DOM: content-visibility skips their
  // rendering, it does not remove them, and Find-in-page depends on that.
  test('keeps scrolled-past rows in the document', async ({ app }) => {
    await app.goto('/activity');
    await expect(app.getByRole('link', { name: /open item 0/i })).toBeVisible();

    await app.mouse.wheel(0, 6000);
    await expect(app.getByRole('link', { name: /open item 30/i })).toBeVisible({
      timeout: 10_000,
    });

    await app.mouse.wheel(0, -6000);

    await expect(app.getByRole('link', { name: /open item 30/i })).toHaveCount(
      1,
    );
  });

  test('the delete action behind a row is not a keyboard tab stop', async ({
    app,
  }) => {
    await app.goto('/activity');
    await expect(app.getByRole('link', { name: /open item 0/i })).toBeVisible();

    // Queried by attribute rather than by role: while the row is closed the
    // action is aria-hidden, which is the point — it is not offered until it
    // is revealed. It is also out of the tab order, so a keyboard user does
    // not hit a hidden stop between every two rows.
    const deleteAction = app.locator('button[aria-label="Delete Item 0"]');
    await expect(deleteAction).toHaveAttribute('tabindex', '-1');
    await expect(
      app.getByRole('button', { name: 'Delete Item 0' }),
    ).toHaveCount(0);
  });

  test('scrolling from a row menu button does not open it', async ({ app }) => {
    await app.goto('/activity');
    const rowLink = app.getByRole('link', { name: /open item 0/i });
    await expect(rowLink).toBeVisible();
    const menuTrigger = rowLink
      .locator('..')
      .getByRole('button', { name: /open menu/i });
    const swipeSurface = rowLink.locator('../..');

    await expect(swipeSurface).toHaveCSS('touch-action', 'pan-y pinch-zoom');

    await menuTrigger.dispatchEvent(
      'pointerdown',
      touchPointer({ clientX: 350, clientY: 300 }),
    );
    await expect(menuTrigger).toHaveAttribute('aria-expanded', 'false');
    await menuTrigger.dispatchEvent(
      'pointermove',
      touchPointer({ clientX: 350, clientY: 350 }),
    );
    await menuTrigger.dispatchEvent(
      'pointerup',
      touchPointer({ clientX: 350, clientY: 350 }),
    );

    await expect(menuTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('tapping a row menu button still opens it', async ({ app }) => {
    await app.goto('/activity');
    const rowLink = app.getByRole('link', { name: /open item 0/i });
    await expect(rowLink).toBeVisible();
    const menuTrigger = rowLink
      .locator('..')
      .getByRole('button', { name: /open menu/i });

    await menuTrigger.dispatchEvent(
      'pointerdown',
      touchPointer({ clientX: 350, clientY: 300 }),
    );
    await menuTrigger.dispatchEvent(
      'pointerup',
      touchPointer({ clientX: 350, clientY: 300 }),
    );

    await expect(app.getByRole('menuitem', { name: /edit/i })).toBeVisible();
  });

  test('keeps the search field at an iOS-safe focus size', async ({ app }) => {
    await app.goto('/activity');
    const search = app.getByRole('textbox', { name: /search activity/i });

    await expect(search).toBeVisible();
    await expect(search).toHaveCSS('font-size', '16px');
    await search.focus();

    await expect
      .poll(() => app.evaluate(() => window.visualViewport?.scale ?? 1))
      .toBe(1);
  });
});

// --- Helpers ---

type PointerCoordinates = {
  clientX: number;
  clientY: number;
};

const touchPointer = ({ clientX, clientY }: PointerCoordinates) => ({
  bubbles: true,
  button: 0,
  cancelable: true,
  clientX,
  clientY,
  ctrlKey: false,
  pointerId: 9,
  pointerType: 'touch',
});
