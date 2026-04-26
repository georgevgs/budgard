import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExpensesPagination from './ExpensesPagination';
import type { Expense } from '@/types/Expense';

vi.mock('@/components/expenses/ExpensesCard', () => ({
  default: ({ expense }: { expense: Expense }) => (
    <div data-testid="expense-card">{expense.id}</div>
  ),
}));

const makeExpenses = (count: number): Expense[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `exp-${i + 1}`,
    amount: 10,
    description: `Expense ${i + 1}`,
    date: '2026-04-01',
    user_id: 'user-1',
    created_at: '2026-04-01T00:00:00Z',
  }));

const renderWith = (count: number) =>
  render(
    <ExpensesPagination
      expenses={makeExpenses(count)}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  );

describe('ExpensesPagination', () => {
  it('does not render pagination controls under the page-size threshold', () => {
    renderWith(10);

    expect(screen.queryByLabelText(/pagination\.next/)).not.toBeInTheDocument();
    expect(screen.getAllByTestId('expense-card')).toHaveLength(10);
  });

  it('only renders the first page of expenses', () => {
    renderWith(25);

    expect(screen.getAllByTestId('expense-card')).toHaveLength(10);
  });

  it('navigates to the next page', () => {
    const scrollSpy = vi.fn();
    Object.defineProperty(window, 'scrollTo', { value: scrollSpy, writable: true });

    renderWith(25);

    fireEvent.click(screen.getByLabelText('pagination.next'));
    expect(screen.getByText('exp-11')).toBeInTheDocument();
    expect(scrollSpy).toHaveBeenCalled();
  });

  it('shows ellipsis only when total pages exceed 5', () => {
    const { rerender } = renderWith(40);
    expect(screen.queryAllByLabelText('pagination.more')).toHaveLength(0);

    rerender(
      <ExpensesPagination
        expenses={makeExpenses(60)}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getAllByLabelText('pagination.more').length).toBeGreaterThan(0);
  });

  it('disables previous on the first page', () => {
    renderWith(25);

    expect(screen.getByLabelText('pagination.previous')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('disables next on the last page', () => {
    Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
    renderWith(25);

    fireEvent.click(screen.getByLabelText('pagination.next'));
    fireEvent.click(screen.getByLabelText('pagination.next'));

    expect(screen.getByLabelText('pagination.next')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('renders middle ellipsis when navigating to a middle page in a long set', () => {
    Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
    renderWith(100);

    fireEvent.click(screen.getByLabelText('pagination.next'));
    fireEvent.click(screen.getByLabelText('pagination.next'));
    fireEvent.click(screen.getByLabelText('pagination.next'));
    fireEvent.click(screen.getByLabelText('pagination.next'));

    expect(screen.getAllByLabelText('pagination.more').length).toBe(2);
  });
});
