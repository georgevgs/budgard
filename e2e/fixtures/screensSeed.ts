import { E2E_USER_ID } from './test';

// Shared by the screens contact sheets so each one looks at the same data.
const CATEGORY_IDS = ['cat-groceries', 'cat-transport'];

export const seed = (data: Record<string, Record<string, unknown>[]>) => {
  data.expenses.push(
    ...Array.from({ length: 8 }, (_, index) => ({
      id: `seed-${index}`,
      user_id: E2E_USER_ID,
      amount: 12 + index * 7,
      description: `Sample expense ${index + 1}`,
      date: new Date(Date.now() - index * 86400000).toISOString().slice(0, 10),
      category_id: CATEGORY_IDS[index % 2],
      type: 'expense',
      created_at: new Date().toISOString(),
    })),
  );
  data.recurring_expenses.push({
    id: 'rec-1',
    user_id: E2E_USER_ID,
    // `getRecurringExpenses` filters on `.eq('type', 'expense')`, so a seeded
    // row without one is invisible to the app, which is why this contact
    // sheet showed an empty Recurring screen and a zeroed commitments card on
    // Plan for the whole redesign.
    type: 'expense',
    description: 'Internet',
    amount: 39,
    frequency: 'monthly',
    start_date: new Date().toISOString().slice(0, 10),
    next_due_date: new Date(Date.now() + 2 * 86400000)
      .toISOString()
      .slice(0, 10),
    active: true,
    category_id: 'cat-transport',
    created_at: new Date().toISOString(),
  });
  data.recurring_expenses.push({
    id: 'rec-income-1',
    user_id: E2E_USER_ID,
    type: 'income',
    description: 'Monthly salary',
    amount: 2400,
    frequency: 'monthly',
    start_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    active: true,
    category_id: 'cat-salary',
    created_at: new Date().toISOString(),
  });
};
