import { test, expect } from './fixtures/test';

// A refund is stored as a negative expense (see useRefundDialog). Every place
// an amount is written has to read it as money coming BACK — not as a doubled
// minus, and not as a spend.
test.describe('refunds read as money in', () => {
  test.beforeEach(async ({ data }) => {
    data.expenses.push({
      id: 'refund-1',
      user_id: '11111111-1111-4111-8111-111111111111',
      amount: -18.25,
      description: 'Returned jacket',
      date: new Date().toISOString().slice(0, 10),
      category_id: 'cat-groceries',
      type: 'expense',
      created_at: new Date().toISOString(),
    });
  });

  test('in the activity feed', async ({ app }) => {
    await app.goto('/activity');

    await expect(app.getByText('+18,25€', { exact: true })).toBeVisible();
    await expect(app.getByText(/−-|--18/)).toHaveCount(0);
  });

  test('on the transaction detail screen', async ({ app }) => {
    await app.goto('/t/refund-1');

    await expect(app.getByText('+18,25€', { exact: true })).toBeVisible();
  });

  test("in Today's recent activity", async ({ app }) => {
    await app.goto('/today');

    await expect(app.getByText('+18,25€', { exact: true })).toBeVisible();
  });
});
