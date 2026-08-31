import { test, expect } from './fixtures/test';

const USER = '11111111-1111-4111-8111-111111111111';

const monthsOfSpending = (count: number) => {
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 14);

    return {
      id: `m-${index}`,
      amount: 400 + index * 30,
      description: `Month ${index}`,
      date: date.toISOString().slice(0, 10),
      category_id: 'cat-groceries',
      type: 'expense',
      user_id: USER,
      created_at: date.toISOString(),
    };
  });
};

const PRO = {
  id: 'sub-1',
  status: 'active',
  current_period_end: new Date(Date.now() + 86_400_000 * 30).toISOString(),
  cancel_at_period_end: false,
};

test.describe('year in rhythm', () => {
  test('appears once there is enough history to call it a rhythm', async ({
    app,
    data,
  }) => {
    data.expenses.push(...monthsOfSpending(8));

    await app.goto('/trends');

    await expect(
      app.getByRole('heading', { name: /year in rhythm/i }),
    ).toBeVisible();
    // The baseline is stated as a fact about the user, not as a target.
    await expect(app.getByText(/your usual month is about/i)).toBeVisible();
  });

  // The Pro gate protects the detailed history — the year picker, the
  // breakdowns, the drill-downs. The rhythm shows a shape you cannot read a
  // figure off or click into, so gating the one visual the app is
  // recognisable by would hide it from exactly the people it might persuade.
  test('is visible without a subscription', async ({ app, data }) => {
    data.expenses.push(...monthsOfSpending(8));

    await app.goto('/trends');

    await expect(
      app.getByRole('heading', { name: /year in rhythm/i }),
    ).toBeVisible();
    // The one remaining gate (forecast) follows all free insights, rather
    // than interrupting them with a locked tile near the top of the screen —
    // cash flow itself no longer gates at all, it adapts per tier instead.
    await expect(
      app.getByRole('heading', { name: /forecast is a pro feature/i }),
    ).toBeVisible();
  });

  test('reads a rolling year, so it works for a subscriber too', async ({
    app,
    data,
  }) => {
    data.subscriptions.push(PRO);
    data.expenses.push(...monthsOfSpending(8));

    await app.goto('/trends');

    await expect(
      app.getByRole('heading', { name: /year in rhythm/i }),
    ).toBeVisible();
  });

  // Three points is not a rhythm, and a wave drawn through them would imply a
  // pattern that has not happened yet.
  test('stays away until a pattern actually exists', async ({ app, data }) => {
    data.expenses.push(...monthsOfSpending(2));

    await app.goto('/trends');
    await expect(app.getByRole('heading', { name: /trends/i })).toBeVisible();

    await expect(
      app.getByRole('heading', { name: /year in rhythm/i }),
    ).toBeHidden();
  });
});
