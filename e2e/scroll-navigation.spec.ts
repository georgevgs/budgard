import { E2E_USER_ID, expect, test } from './fixtures/test';

test.beforeEach(async ({ data }) => {
  const today = new Date().toISOString().slice(0, 10);
  for (let index = 0; index < 60; index += 1) {
    data.expenses.push({
      id: `scroll-${index}`,
      amount: index + 1,
      description: `Scroll item ${index}`,
      date: today,
      category_id: 'cat-groceries',
      type: 'expense',
      user_id: E2E_USER_ID,
      created_at: new Date(Date.now() - index * 1000).toISOString(),
    });
  }
});

test('Activity keeps search reachable while day headings scroll away', async ({
  app,
}) => {
  await app.goto('/activity');
  const search = app.getByRole('textbox', { name: /search activity/i });
  await expect(search).toBeVisible();
  await expect(
    app.getByRole('link', { name: /open scroll item 0$/i }),
  ).toBeVisible();

  await app.mouse.wheel(0, 600);
  await expect
    .poll(() => app.evaluate(() => window.scrollY))
    .toBeGreaterThan(500);

  await expect(search).toBeInViewport();
  await expect(
    app.locator('.activity-day-header').first(),
  ).not.toBeInViewport();
  await search.fill('Scroll item 50');
  await expect(
    app.getByRole('link', { name: /open scroll item 50$/i }),
  ).toBeVisible();
});

test('switching from a long list to a shorter tab preserves both scroll positions', async ({
  app,
}) => {
  await app.goto('/activity');
  await expect(
    app.getByRole('link', { name: /open scroll item 0$/i }),
  ).toBeVisible();
  await app.mouse.wheel(0, 1400);
  await expect(
    app.getByRole('link', { name: /open scroll item 30$/i }),
  ).toBeVisible();
  await app.mouse.wheel(0, 600);
  await expect
    .poll(() => app.evaluate(() => window.scrollY))
    .toBeGreaterThan(1200);
  await app.mouse.wheel(0, -100);
  const nav = app.getByRole('navigation');
  await expect(nav.getByRole('link', { name: /^plan$/i })).toBeInViewport();
  const activityY = await app.evaluate(() => window.scrollY);

  await nav.getByRole('link', { name: /^plan$/i }).click();
  await expect(app).toHaveURL(/\/plan$/);
  await expect.poll(() => app.evaluate(() => window.scrollY)).toBe(0);
  await nav.getByRole('link', { name: /^activity$/i }).click();

  await expect
    .poll(() => app.evaluate(() => window.scrollY))
    .toBeCloseTo(activityY, 0);
});

test('returning after editing a transaction preserves loaded rows and the reading position', async ({
  app,
  data,
}) => {
  await app.goto('/activity');
  await expect(
    app.getByRole('link', { name: /open scroll item 0$/i }),
  ).toBeVisible();
  await app.mouse.wheel(0, 6000);
  const transaction = app.getByRole('link', { name: /open scroll item 30$/i });
  await expect(transaction).toBeVisible();
  await transaction.scrollIntoViewIfNeeded();
  const activityY = await app.evaluate(() => window.scrollY);
  await transaction.click();
  await expect(app).toHaveURL(/\/t\/scroll-30$/);
  await expect(
    app.getByRole('heading', { name: 'Scroll item 30', exact: true }),
  ).toBeVisible();

  await app.getByRole('button', { name: /^edit$/i }).click();
  await app.getByLabel('Amount', { exact: true }).fill('42');
  await app.getByRole('dialog').getByRole('button', { name: /save/i }).click();
  await expect
    .poll(() => data.expenses.find((row) => row.id === 'scroll-30')?.amount)
    .toBe(42);
  await expect(app.getByRole('dialog')).toBeHidden();
  await app.getByRole('button', { name: /^back$/i }).click();

  await expect(app).toHaveURL(/\/activity$/);
  await expect
    .poll(() => app.evaluate(() => window.scrollY))
    .toBeCloseTo(activityY, 0);
  await expect(transaction).toBeInViewport();
});

for (const [route, parent] of [
  ['/t/exp-1', '/activity'],
  ['/networth', '/plan'],
  ['/trends/explore', '/trends'],
]) {
  test(`a direct entry to ${route} goes back to ${parent}`, async ({ app }) => {
    await app.goto(route);
    await app.getByRole('button', { name: /^back$/i }).click();

    await expect(app).toHaveURL(new RegExp(`${parent}$`));
    await expect(
      app.getByRole('navigation').locator('a[aria-current="page"]'),
    ).toHaveAttribute('href', parent);
  });
}

test('returning from a transaction preserves the Activity search', async ({
  app,
}) => {
  await app.goto('/activity');
  const search = app.getByRole('textbox', { name: /search activity/i });
  await search.fill('Scroll item 30');
  await app.getByRole('link', { name: /open scroll item 30$/i }).click();
  await expect(app).toHaveURL(/\/t\/scroll-30$/);
  await app.goBack();

  await expect(search).toHaveValue('Scroll item 30');
  await expect(
    app.getByRole('link', { name: /open scroll item 30$/i }),
  ).toBeVisible();
  await expect(
    app.getByRole('link', { name: /open scroll item 0$/i }),
  ).toBeHidden();
});
