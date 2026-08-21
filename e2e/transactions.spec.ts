import { test, expect } from './fixtures/test';

// The loop the whole product is built around. If logging, correcting and
// removing a transaction works, most of the app works.
test.describe('transactions', () => {
  test('logs a new expense and shows it on the feed', async ({ app, data }) => {
    await app.goto('/today');
    await openAddExpense(app);

    await app.getByLabel('Amount', { exact: true }).fill('12,80');
    await app.getByLabel('Description', { exact: true }).fill('Bus ticket');
    await app.getByRole('button', { name: /save/i }).click();

    // toHaveCount(1) rather than toBeVisible(): an optimistic insert renders
    // the temp row and the saved row side by side for a beat, and this asserts
    // the reconcile actually collapses them instead of leaving a duplicate.
    await expect(
      app.getByRole('button', { name: 'Edit Bus ticket' }),
    ).toHaveCount(1);

    // It reached the service layer, not just the optimistic list.
    await expect
      .poll(() => data.expenses.some((row) => row.description === 'Bus ticket'))
      .toBe(true);
  });

  test('keeps the Save button disabled until the form is valid', async ({
    app,
  }) => {
    await app.goto('/today');
    await openAddExpense(app);

    const save = app.getByRole('button', { name: /save/i });
    await expect(save).toBeDisabled();

    await app.getByLabel('Amount', { exact: true }).fill('9,00');
    await app.getByLabel('Description', { exact: true }).fill('Coffee');

    await expect(save).toBeEnabled();
  });

  test('edits an existing transaction from the activity row', async ({
    app,
    data,
  }) => {
    await app.goto('/activity');

    await app.getByRole('button', { name: /edit weekly shop/i }).click();
    const description = app.getByLabel('Description', { exact: true });
    await expect(description).toHaveValue('Weekly shop');

    await description.fill('Weekly shop (corrected)');
    await app.getByRole('button', { name: /save/i }).click();

    await expect(
      app.getByRole('button', { name: 'Edit Weekly shop (corrected)' }),
    ).toHaveCount(1);
    await expect
      .poll(
        () =>
          data.expenses.find((row) => row.id === 'exp-1')?.description ?? '',
      )
      .toBe('Weekly shop (corrected)');
  });

  test('a cancelled edit leaves the transaction untouched', async ({
    app,
    data,
  }) => {
    await app.goto('/activity');

    await app.getByRole('button', { name: /edit weekly shop/i }).click();
    await app
      .getByLabel('Description', { exact: true })
      .fill('Should not persist');
    await app.getByRole('button', { name: /cancel/i }).click();

    await expect(
      app.getByRole('button', { name: 'Edit Weekly shop' }),
    ).toBeVisible();
    expect(data.expenses.find((row) => row.id === 'exp-1')?.description).toBe(
      'Weekly shop',
    );
  });
});

// --- Helpers ---

const openAddExpense = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: /open actions menu/i }).click();
  await page.getByRole('button', { name: /add expense/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
};
