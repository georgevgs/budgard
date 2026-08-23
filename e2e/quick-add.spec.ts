import { expect, failNextBackendRequest, test } from './fixtures/test';

// The loop the app is used for. Two taps and a number is the target; anything
// that turns it back into a form is a regression worth catching.
test.describe('quick add', () => {
  const openPad = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: /open actions menu/i }).click();
    await page.getByRole('button', { name: /add expense/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  };

  test('logs an expense from the keypad in two taps and a number', async ({
    app,
    data,
  }) => {
    await app.goto('/today');
    await openPad(app);

    // Digits fill from the right: 1-2-8-0 is 12,80.
    for (const digit of ['1', '2', '8', '0']) {
      await app.getByRole('button', { name: digit, exact: true }).click();
    }
    await expect(app.getByText('12,80€')).toBeVisible();

    await app.getByRole('radio', { name: /groceries/i }).click();
    await app.getByRole('button', { name: /^save$/i }).click();

    await expect
      .poll(() => data.expenses.find((row) => row.amount === 12.8)?.description)
      .toBe('Groceries');
  });

  test('logs a named expense from Activity and keeps it after reload', async ({
    app,
    data,
  }) => {
    await app.goto('/activity');
    await openPad(app);

    for (const digit of ['8', '2', '5']) {
      await app.getByRole('button', { name: digit, exact: true }).click();
    }
    await app.getByRole('textbox', { name: /name/i }).fill('Bus fare');
    await app.getByRole('radio', { name: /transport/i }).click();
    await app.getByRole('button', { name: /^save$/i }).click();

    await expect
      .poll(
        () =>
          data.expenses.find((row) => row.description === 'Bus fare')?.amount,
      )
      .toBe(8.25);
    const savedRow = app.getByText('Bus fare');
    await expect(savedRow).toHaveCount(1);
    await expect(savedRow).toBeVisible();

    await app.reload();
    await expect(app.getByText('Bus fare')).toHaveCount(1);
    await expect(app.getByText('Bus fare')).toBeVisible();
  });

  test('cannot save nothing', async ({ app }) => {
    await app.goto('/today');
    await openPad(app);

    await expect(app.getByRole('button', { name: /^save$/i })).toBeDisabled();

    await app.getByRole('button', { name: '5', exact: true }).click();

    await expect(app.getByRole('button', { name: /^save$/i })).toBeEnabled();
  });

  test('backspace removes one digit', async ({ app }) => {
    await app.goto('/today');
    await openPad(app);

    for (const digit of ['1', '2', '3']) {
      await app.getByRole('button', { name: digit, exact: true }).click();
    }
    await expect(app.getByText('1,23€')).toBeVisible();

    await app.getByRole('button', { name: /delete/i }).click();

    await expect(app.getByText('0,12€')).toBeVisible();
  });

  // Asking for more detail must not cost what was already typed.
  test('carries the amount into the full form', async ({ app }) => {
    await app.goto('/today');
    await openPad(app);

    for (const digit of ['4', '5', '0']) {
      await app.getByRole('button', { name: digit, exact: true }).click();
    }
    await app.getByRole('button', { name: /more details/i }).click();

    await expect(app.getByLabel('Amount', { exact: true })).toHaveValue('4,50');
  });

  test('keeps Activity usable when the server rejects an expense', async ({
    app,
    data,
  }) => {
    await app.goto('/activity');
    await openPad(app);

    for (const digit of ['5', '0', '0']) {
      await app.getByRole('button', { name: digit, exact: true }).click();
    }
    await app.getByRole('textbox', { name: /name/i }).fill('Rejected expense');
    failNextBackendRequest(
      400,
      '23514',
      'Expense failed a database constraint',
    );
    await app.getByRole('button', { name: /^save$/i }).click();

    await expect(app.getByText('Failed to add expense')).toBeVisible();
    await expect(
      app.getByRole('heading', { name: /something went wrong/i }),
    ).toBeHidden();
    await expect(app.getByText('Rejected expense')).toBeHidden();
    expect(
      data.expenses.some((row) => row.description === 'Rejected expense'),
    ).toBe(false);
  });
});
