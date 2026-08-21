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

    await expect(
      app.getByRole('link', { name: /open item 30/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  // Off-screen groups must stay in the DOM: content-visibility skips their
  // rendering, it does not remove them, and Find-in-page depends on that.
  test('keeps scrolled-past rows in the document', async ({ app }) => {
    await app.goto('/activity');
    await expect(app.getByRole('link', { name: /open item 0/i })).toBeVisible();

    await app.mouse.wheel(0, 6000);
    await expect(
      app.getByRole('link', { name: /open item 30/i }),
    ).toBeVisible({ timeout: 10_000 });

    await app.mouse.wheel(0, -6000);

    await expect(app.getByRole('link', { name: /open item 30/i })).toHaveCount(1);
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
});
