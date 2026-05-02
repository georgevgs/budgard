import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BudgetCategorySection, {
  type BudgetCategoryRow,
} from './BudgetCategorySection';

const row = (overrides: Partial<BudgetCategoryRow> = {}): BudgetCategoryRow => ({
  id: 'c1',
  name: 'Food',
  color: '#000000',
  icon: null,
  cap: 100,
  spent: 50,
  percent: 50,
  remaining: 50,
  isOver: false,
  isWarning: false,
  ...overrides,
});

describe('BudgetCategorySection', () => {
  it('renders nothing when there are no expense categories', () => {
    const { container } = render(
      <BudgetCategorySection
        totalCategoryCount={0}
        rows={[]}
        currency="EUR"
        onManage={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the empty hint when categories exist but no caps are set', () => {
    const onManage = vi.fn();
    render(
      <BudgetCategorySection
        totalCategoryCount={3}
        rows={[]}
        currency="EUR"
        onManage={onManage}
      />,
    );

    fireEvent.click(screen.getByText('budget.categoryBudgets.emptyHint'));
    expect(onManage).toHaveBeenCalledOnce();
  });

  it('renders one row per cap with the category name', () => {
    render(
      <BudgetCategorySection
        totalCategoryCount={2}
        rows={[
          row({ id: 'c1', name: 'Food' }),
          row({ id: 'c2', name: 'Transport' }),
        ]}
        currency="EUR"
        onManage={vi.fn()}
      />,
    );

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('uses the destructive bar when a row is over budget', () => {
    const { container } = render(
      <BudgetCategorySection
        totalCategoryCount={1}
        rows={[row({ isOver: true, percent: 120 })]}
        currency="EUR"
        onManage={vi.fn()}
      />,
    );

    expect(container.querySelector('.bg-destructive')).not.toBeNull();
  });

  it('uses the amber bar when a row is in warning range', () => {
    const { container } = render(
      <BudgetCategorySection
        totalCategoryCount={1}
        rows={[row({ isWarning: true, percent: 85 })]}
        currency="EUR"
        onManage={vi.fn()}
      />,
    );

    expect(container.querySelector('.bg-amber-500')).not.toBeNull();
  });

  it('opens manager via the header button', () => {
    const onManage = vi.fn();
    render(
      <BudgetCategorySection
        totalCategoryCount={1}
        rows={[row()]}
        currency="EUR"
        onManage={onManage}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: /budget\.categoryBudgets\.manage/ }),
    );
    expect(onManage).toHaveBeenCalledOnce();
  });
});
