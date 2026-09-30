import { expect, failNextBackendRequest, test } from './fixtures/test';

// A modal dialog switches pointer events off on <body>, and the toaster used
// to inherit that: an error toast raised while a sheet was open showed a
// "Try again" nobody could tap. Tapping it must also leave the sheet open.
test('a toast stays tappable while a dialog is open', async ({ app, data }) => {
  await app.goto('/today');
  const openPad = async () => {
    await app.getByRole('button', { name: /open actions menu/i }).click();
    await app.getByRole('button', { name: /add expense/i }).click();
    await expect(app.getByRole('dialog')).toBeVisible();
  };

  await openPad();
  for (const digit of ['4', '2', '0']) {
    await app.getByRole('button', { name: digit, exact: true }).click();
  }
  await app
    .getByRole('textbox', { name: 'Description (optional)' })
    .fill('Retried lunch');
  failNextBackendRequest('expenses', 503, 'PGRST000', 'Service unavailable');
  await app.getByRole('button', { name: /^save$/i }).click();
  const retry = app.getByRole('button', { name: /try again/i });
  await expect(retry).toBeVisible();

  await openPad();
  await retry.click();

  await expect
    .poll(() =>
      data.expenses.filter((row) => row.description === 'Retried lunch'),
    )
    .toHaveLength(1);
  await expect(app.getByRole('dialog')).toBeVisible();
});
