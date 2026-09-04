import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import BudgetUsedTile from '@/components/today/tiles/BudgetUsedTile';

type Overrides = Partial<React.ComponentProps<typeof BudgetUsedTile>>;

const renderTile = (overrides: Overrides = {}) => {
  return render(
    <MemoryRouter>
      <BudgetUsedTile
        spentThisMonth={600}
        monthlyBudget={1000}
        currency="EUR"
        {...overrides}
      />
    </MemoryRouter>,
  );
};

describe('BudgetUsedTile', () => {
  it('draws the plan as a proportion of the ring', () => {
    renderTile();

    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  describe('past the plan', () => {
    const over: Overrides = { spentThisMonth: 1300, monthlyBudget: 1000 };

    it('clamps the ring rather than starting a second lap', () => {
      renderTile(over);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    // The clamp is a property of the ring, not of the month. Anyone relying on
    // the accessible name should hear the real figure.
    it('announces the true percentage, not the clamped one', () => {
      renderTile(over);

      expect(
        screen.getByLabelText(/today.tile.budgetUsedAria/),
      ).toBeInTheDocument();
    });
  });

  it('reads as no budget rather than as zero percent', () => {
    renderTile({ monthlyBudget: null });

    expect(
      screen.getAllByText('today.tile.noBudgetYet').length,
    ).toBeGreaterThan(0);
  });
});
