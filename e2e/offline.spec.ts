import { test, expect, setBackendReachable } from './fixtures/test';

// Budgard is offline-first: a save with no server must land locally, tell the
// user it did, and go up on its own when the network returns. This is the
// journey most likely to break silently, because nothing errors when it does.
test.describe('offline writes', () => {
  test('queues an expense saved with no server, then syncs it', async ({
    app,
    data,
  }) => {
    await app.goto('/today');
    await expect(app.getByText('Weekly shop')).toBeVisible();

    setBackendReachable(false);

    await app.getByRole('button', { name: /open actions menu/i }).click();
    await app.getByRole('button', { name: /add expense/i }).click();
    await app.getByRole('button', { name: /more details/i }).click();
    await app.getByLabel('Amount', { exact: true }).fill('7,50');
    await app.getByLabel('Description', { exact: true }).fill('Offline coffee');
    await app.getByRole('button', { name: /save/i }).click();

    // The row is usable immediately even though nothing reached the server.
    await expect(
      app.getByRole('link', { name: 'Open Offline coffee' }),
    ).toBeVisible();
    expect(
      data.expenses.some((row) => row.description === 'Offline coffee'),
    ).toBe(false);

    // And the app says so rather than pretending the save succeeded.
    await expect(
      app.getByText(/pending sync|saved offline/i).first(),
    ).toBeVisible();

    setBackendReachable(true);
    await app.evaluate(() => window.dispatchEvent(new Event('online')));

    await expect
      .poll(
        () => data.expenses.some((row) => row.description === 'Offline coffee'),
        { timeout: 15_000 },
      )
      .toBe(true);
  });
});
