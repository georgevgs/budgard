import { test, expect } from './fixtures/test';

const PRO = {
  id: 'sub-1',
  status: 'active',
  current_period_end: new Date(Date.now() + 86_400_000 * 30).toISOString(),
  cancel_at_period_end: false,
};

// The charts are hand-rolled SVG rather than a library, so nothing but a real
// render proves the paths are well-formed. A NaN in a scale produces an
// invalid `d`, which draws nothing and throws no error — exactly the failure
// mode a unit test on the maths alone cannot catch.
test.describe('charts', () => {
  test.beforeEach(async ({ data }) => {
    data.subscriptions.push(PRO);
    const now = new Date();
    for (let month = 1; month <= 11; month += 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - month, 12);
      data.expenses.push({
        id: `hist-${month}`,
        amount: 300 + month * 47,
        description: `Month ${month}`,
        date: date.toISOString().slice(0, 10),
        category_id: 'cat-groceries',
        type: 'expense',
      });
    }
  });

  test('renders every trends chart with a valid path and a label', async ({
    app,
  }) => {
    const errors: string[] = [];
    app.on('pageerror', (error) => errors.push(error.message));

    await app.goto('/trends');
    await expect(app.locator('svg[role="img"]').first()).toBeVisible();

    const charts = app.locator('svg[role="img"]');
    await expect.poll(() => charts.count()).toBeGreaterThanOrEqual(2);

    // Every chart names itself for a screen reader.
    for (const label of await charts.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('aria-label')),
    )) {
      expect(label ?? '').not.toBe('');
    }

    // No path may contain NaN — the signature of a broken scale.
    const paths = await app
      .locator('svg[role="img"] path')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('d') ?? ''));
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter((d) => d.includes('NaN'))).toEqual([]);

    expect(errors).toEqual([]);
  });

  test('a chart can be read with the keyboard alone', async ({ app }) => {
    await app.goto('/trends');
    const plot = app.locator('svg[role="img"] rect[role="application"]').first();
    await plot.waitFor();

    await plot.focus();
    await app.keyboard.press('ArrowRight');

    // The hover card is a live region, so the value is announced rather than
    // only drawn.
    await expect(app.locator('[role="status"]').first()).toBeVisible();
  });
});
