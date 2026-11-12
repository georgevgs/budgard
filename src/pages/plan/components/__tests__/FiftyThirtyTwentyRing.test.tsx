import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FiftyThirtyTwentyRing } from '@/pages/plan/components/FiftyThirtyTwentyRing';
import type { Expense } from '@/types/Expense';

const expense = (overrides: Partial<Expense>): Expense => ({
  id: crypto.randomUUID(),
  amount: 100,
  description: 'Test',
  date: '2026-08-10',
  user_id: 'u1',
  created_at: '2026-08-10T00:00:00Z',
  ...overrides,
});

const debts = vi.hoisted(() => ({ current: [] as unknown[] }));

const need = { id: 'c-need', name: 'Rent', kind: 'need' };

const expenses: Expense[] = [
  expense({ amount: 800, category: need as Expense['category'] }),
  // An investment set-aside, as invest_goal_surplus writes it.
  expense({ amount: 200, is_excluded: true, goal_id: 'g1' }),
  // A plain transfer between own accounts stays out of every share.
  expense({ amount: 5000, is_excluded: true }),
];

vi.mock('@/common/contexts/DataContext', () => ({
  useExpensesData: () => expenses,
  useIncomesData: () => [],
  useCategoriesData: () => ({ categories: [] }),
  useDataConfig: () => ({ defaultCurrency: 'EUR' }),
  useDebtsData: () => debts.current,
}));

describe('FiftyThirtyTwentyRing', () => {
  // Money moved into an investment goal is excluded from spending, and the
  // ring used to drop it with every other excluded row: 0% saved.
  it('counts an investment set-aside as savings', () => {
    render(<FiftyThirtyTwentyRing selectedMonth="2026-08" />);

    expect(screen.getByText('80% / 50%')).toBeInTheDocument();
    expect(screen.getByText('20% / 20%')).toBeInTheDocument();
  });

  // 800 rent and 200 invested, plus a loan paid 600 against a 400 minimum:
  // the minimum is a need, the 200 above it is debt repayment.
  it('files a loan minimum under needs and the extra under savings', () => {
    debts.current = [
      {
        kind: 'auto_loan',
        currency: 'EUR',
        minimum_payment: 400,
        payments: [{ amount: 600, date: '2026-08-12' }],
      },
    ];
    render(<FiftyThirtyTwentyRing selectedMonth="2026-08" />);

    expect(screen.getByText('75% / 50%')).toBeInTheDocument();
    expect(screen.getByText('25% / 20%')).toBeInTheDocument();
  });
});
