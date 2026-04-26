import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExpensesEmpty from './ExpensesEmpty';

describe('ExpensesEmpty', () => {
  it('passes the formatted month to the heading translation', () => {
    render(<ExpensesEmpty selectedMonth="2026-04" onAddClick={vi.fn()} />);

    expect(
      screen.getByRole('heading', { level: 3, name: 'expenses.noExpensesFor' }),
    ).toBeInTheDocument();
  });

  it('renders the add-expense CTA and forwards clicks', () => {
    const onAddClick = vi.fn();
    render(<ExpensesEmpty selectedMonth="2026-04" onAddClick={onAddClick} />);

    fireEvent.click(screen.getByRole('button', { name: /addExpense/ }));
    expect(onAddClick).toHaveBeenCalledOnce();
  });

  it('uses an aria-hidden decorative image', () => {
    const { container } = render(
      <ExpensesEmpty selectedMonth="2026-04" onAddClick={vi.fn()} />,
    );
    const img = container.querySelector('img');

    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img).toHaveAttribute('alt', '');
  });
});
