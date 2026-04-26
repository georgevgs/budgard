import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/haptics', () => ({
  haptics: { light: vi.fn() },
}));

import SpeedDial from './SpeedDial';

const renderDial = (overrides: Partial<{ onAddExpense: () => void; onAddCategory: () => void }> = {}) => {
  const onAddExpense = overrides.onAddExpense ?? vi.fn();
  const onAddCategory = overrides.onAddCategory ?? vi.fn();
  render(<SpeedDial onAddExpense={onAddExpense} onAddCategory={onAddCategory} />);

  return { onAddExpense, onAddCategory };
};

describe('SpeedDial', () => {
  it('starts collapsed with action buttons not focusable', () => {
    renderDial();

    const expenseBtn = screen.getByLabelText('expenses.addExpense');
    expect(expenseBtn).toHaveAttribute('tabindex', '-1');
  });

  it('opens when the toggle is clicked', () => {
    renderDial();

    fireEvent.click(screen.getByLabelText('speedDial.open'));

    expect(screen.getByLabelText('speedDial.close')).toBeInTheDocument();
    expect(screen.getByLabelText('expenses.addExpense')).toHaveAttribute(
      'tabindex',
      '0',
    );
  });

  it('closes on escape', () => {
    renderDial();

    fireEvent.click(screen.getByLabelText('speedDial.open'));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.getByLabelText('speedDial.open')).toBeInTheDocument();
  });

  it('fires the add-expense callback and closes the dial', () => {
    const { onAddExpense } = renderDial();

    fireEvent.click(screen.getByLabelText('speedDial.open'));
    fireEvent.click(screen.getByLabelText('expenses.addExpense'));

    expect(onAddExpense).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('speedDial.open')).toBeInTheDocument();
  });

  it('fires the add-category callback and closes the dial', () => {
    const { onAddCategory } = renderDial();

    fireEvent.click(screen.getByLabelText('speedDial.open'));
    fireEvent.click(screen.getByLabelText('categories.addCategory'));

    expect(onAddCategory).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('speedDial.open')).toBeInTheDocument();
  });

  it('clicking the overlay closes the dial', () => {
    renderDial();

    fireEvent.click(screen.getByLabelText('speedDial.open'));
    fireEvent.click(screen.getByRole('presentation'));

    expect(screen.getByLabelText('speedDial.open')).toBeInTheDocument();
  });
});
