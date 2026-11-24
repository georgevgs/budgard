import { describe, expect, it } from 'vitest';
import {
  collectLoanMinimumsDue,
  collectLoanPayments,
  projectLoanOutflow,
  splitLoanPaymentsInMonth,
  sumLoanPaymentsInMonth,
} from '@/constants/debtOutflow';
import type { Debt } from '@/types/Debt';

const NOW = new Date(2026, 7, 16, 12, 0, 0);

const debt = (overrides: Partial<Debt>): Debt => ({
  id: 'd1',
  user_id: 'u1',
  name: 'Car loan',
  kind: 'auto_loan',
  original_principal: 5000,
  current_balance: 5000,
  apr: 0,
  minimum_payment: 400,
  currency: 'EUR',
  start_date: '2026-01-01',
  icon: 'car',
  color: '#000',
  is_archived: false,
  is_completed: false,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  payments: [],
  ...overrides,
});

describe('loan payments as outflow', () => {
  it('totals the loan payments of one month', () => {
    const debts = [
      debt({
        payments: [
          { amount: 400, date: '2026-08-03' },
          { amount: 100, date: '2026-08-20' },
          { amount: 400, date: '2026-07-03' },
        ],
      }),
    ];

    expect(sumLoanPaymentsInMonth(debts, 'EUR', '2026-08')).toBe(500);
  });

  // The purchases on the card are the spending and are already logged.
  it('treats a credit card payment as a transfer, not an outflow', () => {
    const debts = [
      debt({
        kind: 'credit_card',
        payments: [{ amount: 400, date: '2026-08-03' }],
      }),
    ];

    expect(collectLoanPayments(debts, 'EUR')).toEqual([]);
  });

  it('leaves out a debt held in another currency', () => {
    const debts = [
      debt({
        currency: 'USD',
        payments: [{ amount: 400, date: '2026-08-03' }],
      }),
    ];

    expect(sumLoanPaymentsInMonth(debts, 'EUR', '2026-08')).toBe(0);
  });

  it('reads a debt cached without payments as having none', () => {
    expect(collectLoanPayments([debt({ payments: undefined })], 'EUR')).toEqual(
      [],
    );
  });

  it('splits a month into the minimum and what was paid above it', () => {
    const debts = [
      debt({
        payments: [
          { amount: 400, date: '2026-08-03' },
          { amount: 250, date: '2026-08-20' },
        ],
      }),
    ];

    expect(splitLoanPaymentsInMonth(debts, 'EUR', '2026-08')).toEqual({
      minimums: 400,
      extra: 250,
    });
  });
});

describe('projected loan outflow', () => {
  it('counts this month once: due until paid, then from next month', () => {
    const unpaid = debt({ payments: [{ amount: 400, date: '2026-07-03' }] });
    const paid = debt({
      payments: [
        { amount: 400, date: '2026-07-03' },
        { amount: 400, date: '2026-08-03' },
      ],
    });

    expect(projectLoanOutflow([unpaid], 'EUR', NOW).restOfMonth).toBe(400);
    expect(projectLoanOutflow([paid], 'EUR', NOW).restOfMonth).toBe(0);
    expect(projectLoanOutflow([paid], 'EUR', NOW).months[0]).toBe(400);
  });

  it('stops when the loan is paid off', () => {
    const outflow = projectLoanOutflow(
      [
        debt({
          current_balance: 1000,
          payments: [{ amount: 400, date: '2026-08-03' }],
        }),
      ],
      'EUR',
      NOW,
    );

    expect(outflow.months.slice(0, 4)).toEqual([400, 400, 200, 0]);
  });

  it('accrues interest before each minimum, as the tracker does', () => {
    const outflow = projectLoanOutflow(
      [
        debt({
          current_balance: 500,
          apr: 36.5,
          payments: [{ amount: 400, date: '2026-08-03' }],
        }),
      ],
      'EUR',
      NOW,
    );

    // September has 30 days: 500 + 15 interest, less 400, leaves 115. October
    // adds 31 days on 115, 3.57.
    expect(outflow.months.slice(0, 3)).toEqual([400, 118.57, 0]);
  });

  // Someone paying the loan as a recurring bill has it in the forecast
  // already, and never logs a payment here.
  it('projects nothing for a loan never paid through the tracker', () => {
    const outflow = projectLoanOutflow([debt({ payments: [] })], 'EUR', NOW);

    expect(outflow.restOfMonth).toBe(0);
    expect(outflow.months.every((amount) => 0 === amount)).toBe(true);
  });
});

describe('loan minimums due this month', () => {
  const july = { amount: 400, date: '2026-07-03' };

  it('falls due on the day of the month the debt started', () => {
    const due = collectLoanMinimumsDue(
      [debt({ start_date: '2026-01-25', payments: [july] })],
      'EUR',
      NOW,
    );

    expect(due).toEqual([
      {
        id: 'd1',
        description: 'Car loan',
        amount: 400,
        date: new Date(2026, 7, 25),
      },
    ]);
  });

  it('counts only what is left of the minimum', () => {
    const partlyPaid = debt({
      payments: [july, { amount: 50, date: '2026-08-02' }],
    });

    expect(collectLoanMinimumsDue([partlyPaid], 'EUR', NOW)).toEqual([
      {
        id: 'd1',
        description: 'Car loan',
        amount: 350,
        date: new Date(2026, 7, 1),
      },
    ]);
  });

  it('is settled once the payments reach the minimum', () => {
    const paid = debt({
      payments: [
        july,
        { amount: 200, date: '2026-08-02' },
        { amount: 200, date: '2026-08-09' },
      ],
    });

    expect(collectLoanMinimumsDue([paid], 'EUR', NOW)).toEqual([]);
  });

  it('the forecast takes out the same remainder', () => {
    const partlyPaid = debt({
      payments: [july, { amount: 50, date: '2026-08-02' }],
    });

    expect(projectLoanOutflow([partlyPaid], 'EUR', NOW).restOfMonth).toBe(350);
  });

  it('caps the unpaid installment at the remaining balance', () => {
    const partlyPaid = debt({
      current_balance: 120,
      payments: [{ amount: 50, date: '2026-08-02' }],
    });

    expect(collectLoanMinimumsDue([partlyPaid], 'EUR', NOW)[0].amount).toBe(
      120,
    );
    expect(projectLoanOutflow([partlyPaid], 'EUR', NOW).restOfMonth).toBe(120);
  });

  it('deducts only the unpaid installment before projecting next month', () => {
    const partlyPaid = debt({
      current_balance: 600,
      payments: [{ amount: 50, date: '2026-08-02' }],
    });

    const projected = projectLoanOutflow([partlyPaid], 'EUR', NOW);

    expect(projected.restOfMonth).toBe(350);
    expect(projected.months.slice(0, 2)).toEqual([250, 0]);
  });

  it('never asks for more than is still owed', () => {
    const nearlyDone = debt({ current_balance: 120, payments: [july] });

    expect(collectLoanMinimumsDue([nearlyDone], 'EUR', NOW)[0].amount).toBe(
      120,
    );
  });

  it('matches what the forecast takes out for the rest of the month', () => {
    const debts = [debt({ apr: 12, payments: [july] })];
    const due = collectLoanMinimumsDue(debts, 'EUR', NOW);

    expect(due[0].amount).toBe(
      projectLoanOutflow(debts, 'EUR', NOW).restOfMonth,
    );
  });
});
