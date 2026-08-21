import { test, expect } from './fixtures/test';

test.describe('transaction detail', () => {
  test('opens from an activity row and shows the transaction', async ({
    app,
  }) => {
    await app.goto('/activity');
    await app.getByRole('link', { name: /open weekly shop/i }).click();

    await expect(app).toHaveURL(/\/t\/exp-1$/);
    await expect(
      app.getByRole('heading', { name: 'Weekly shop' }),
    ).toBeVisible();
    await expect(app.getByText('24,50€')).toBeVisible();
  });

  test('saves a note when the field loses focus', async ({ app, data }) => {
    await app.goto('/t/exp-1');

    const note = app.getByLabel(/note/i);
    await note.fill('Split with Anna');
    await note.blur();

    await expect
      .poll(() => data.expenses.find((row) => row.id === 'exp-1')?.note)
      .toBe('Split with Anna');
  });

  // The exclusion has to reach every total, not just this screen.
  test('excluding a transaction removes it from the month total', async ({
    app,
    data,
  }) => {
    await app.goto('/today');
    // 24.50 spent, 1500 budget -> 1475.50 left.
    await expect(app.getByText('1.475,50€')).toBeVisible();

    await app.goto('/t/exp-1');
    await app.getByRole('switch').click();

    await expect
      .poll(() => data.expenses.find((row) => row.id === 'exp-1')?.is_excluded)
      .toBe(true);

    await app.goto('/today');
    await expect(app.getByText('1.500,00€')).toBeVisible();
  });

  test('a deleted transaction gets a real answer, not a blank screen', async ({
    app,
  }) => {
    await app.goto('/t/does-not-exist');

    await expect(app.getByText(/no longer here/i)).toBeVisible();
    await expect(
      app.getByRole('link', { name: /back to activity/i }),
    ).toBeVisible();
  });
});
