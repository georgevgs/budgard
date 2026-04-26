import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BudgetProgress from './BudgetProgress';

vi.mock('@/components/budget/BudgetForm', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="budget-form" /> : null,
}));

describe('BudgetProgress', () => {
  it('shows the set-budget CTA when no budget exists', () => {
    render(
      <BudgetProgress
        monthlyBudget={null}
        monthlySpent={0}
        onBudgetUpdate={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /setBudget/ })).toBeInTheDocument();
  });

  it('opens the form from the CTA', () => {
    render(
      <BudgetProgress
        monthlyBudget={null}
        monthlySpent={0}
        onBudgetUpdate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /setBudget/ }));
    expect(screen.getByTestId('budget-form')).toBeInTheDocument();
  });

  it('renders progress and remaining when under budget', () => {
    render(
      <BudgetProgress
        monthlyBudget={1000}
        monthlySpent={500}
        onBudgetUpdate={vi.fn()}
      />,
    );

    expect(screen.getByText(/budget\.budgetProgress/)).toBeInTheDocument();
    expect(screen.getByText(/budget\.remaining/)).toBeInTheDocument();
  });

  it('uses warning color when between 80% and 100%', () => {
    const { container } = render(
      <BudgetProgress
        monthlyBudget={1000}
        monthlySpent={850}
        onBudgetUpdate={vi.fn()}
      />,
    );

    const indicator = container.querySelector('.bg-amber-500');
    expect(indicator).not.toBeNull();
  });

  it('shows over-budget label and destructive color when overspent', () => {
    const { container } = render(
      <BudgetProgress
        monthlyBudget={1000}
        monthlySpent={1200}
        onBudgetUpdate={vi.fn()}
      />,
    );

    expect(screen.getByText('budget.overBudget')).toBeInTheDocument();
    const indicator = container.querySelector('.bg-destructive');
    expect(indicator).not.toBeNull();
  });

  it('opens the form via the edit button', () => {
    render(
      <BudgetProgress
        monthlyBudget={1000}
        monthlySpent={500}
        onBudgetUpdate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /editBudget/ }));
    expect(screen.getByTestId('budget-form')).toBeInTheDocument();
  });

  it('caps progress percentage at 100', () => {
    const { container } = render(
      <BudgetProgress
        monthlyBudget={1000}
        monthlySpent={5000}
        onBudgetUpdate={vi.fn()}
      />,
    );

    const transform = container
      .querySelector('[style*="translateX"]')
      ?.getAttribute('style');
    expect(transform).toContain('translateX(-0%)');
  });
});
