import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

let dataState = { categories: [] as Category[], isInitialized: true };

vi.mock('@/contexts/DataContext', () => ({
  useCategoriesData: () => ({
    categories: dataState.categories,
    expenseCategories: dataState.categories,
    incomeCategories: [],
  }),
  useDataConfig: () => ({ isInitialized: dataState.isInitialized }),
}));

// Mocks render DialogTitle/DialogDescription (sr-only) so Radix's runtime
// a11y check inside DialogContent finds them — the real components include
// these in their DialogHeader, so this keeps the mock contract aligned.
vi.mock('@/components/expenses/ExpensesForm', () => ({
  default: ({ expense }: { expense?: Expense }) => (
    <>
      <DialogTitle className="sr-only">Expense form</DialogTitle>
      <DialogDescription className="sr-only">Expense form</DialogDescription>
      <div data-testid="expense-form" data-expense-id={expense?.id ?? ''} />
    </>
  ),
}));

vi.mock('@/components/categories/CategoryManager', () => ({
  CategoryManager: () => (
    <>
      <DialogTitle className="sr-only">Category manager</DialogTitle>
      <DialogDescription className="sr-only">Category manager</DialogDescription>
      <div data-testid="category-manager" />
    </>
  ),
}));

import FormsManager, { FORM_TYPES } from './FormsManager';

const expense: Expense = {
  id: 'e1',
  amount: 10,
  description: 'x',
  date: '2026-04-01',
  user_id: 'u1',
  created_at: '2026-04-01',
};

describe('FormsManager', () => {
  it('renders nothing while data is not initialized', () => {
    dataState = { categories: [], isInitialized: false };
    const { container } = render(
      <FormsManager
        formType={FORM_TYPES.NEW_EXPENSE}
        onClose={vi.fn()}
        onExpenseSubmit={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders the expense form for NEW_EXPENSE without a selectedExpense', () => {
    dataState = { categories: [], isInitialized: true };
    render(
      <FormsManager
        formType={FORM_TYPES.NEW_EXPENSE}
        onClose={vi.fn()}
        onExpenseSubmit={vi.fn()}
      />,
    );

    const form = screen.getByTestId('expense-form');
    expect(form).toBeInTheDocument();
    expect(form.getAttribute('data-expense-id')).toBe('');
  });

  it('passes the selectedExpense for EDIT_EXPENSE', () => {
    dataState = { categories: [], isInitialized: true };
    render(
      <FormsManager
        formType={FORM_TYPES.EDIT_EXPENSE}
        onClose={vi.fn()}
        selectedExpense={expense}
        onExpenseSubmit={vi.fn()}
      />,
    );

    expect(screen.getByTestId('expense-form').getAttribute('data-expense-id')).toBe(
      'e1',
    );
  });

  it('renders the category manager for NEW_CATEGORY', () => {
    dataState = { categories: [], isInitialized: true };
    render(
      <FormsManager
        formType={FORM_TYPES.NEW_CATEGORY}
        onClose={vi.fn()}
        onExpenseSubmit={vi.fn()}
      />,
    );

    expect(screen.getByTestId('category-manager')).toBeInTheDocument();
    expect(screen.queryByTestId('expense-form')).not.toBeInTheDocument();
  });

  it('renders neither form when formType is null', () => {
    dataState = { categories: [], isInitialized: true };
    render(
      <FormsManager
        formType={null}
        onClose={vi.fn()}
        onExpenseSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('expense-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('category-manager')).not.toBeInTheDocument();
  });
});
