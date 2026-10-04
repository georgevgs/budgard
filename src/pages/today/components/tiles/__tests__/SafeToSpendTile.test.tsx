import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SafeToSpendTile } from '@/pages/today/components/tiles/SafeToSpendTile';

// Bare translation keys hide whether the amount reaches the accessible name.
const spellOut = vi.hoisted(
  () => (key: string, params?: Record<string, unknown>) => {
    if (!params) {
      return key;
    }

    return `${key}(${Object.values(params).join('|')})`;
  },
);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: spellOut, i18n: { language: 'en' } }),
}));

type Overrides = Partial<React.ComponentProps<typeof SafeToSpendTile>>;

const renderTile = (overrides: Overrides = {}) => {
  return render(
    <MemoryRouter>
      <SafeToSpendTile
        status="comfortable"
        safeToSpend={420}
        spentThisMonth={580}
        dailyAllowance={35}
        typicalDay={24}
        daysRemaining={12}
        currency="EUR"
        {...overrides}
      />
    </MemoryRouter>,
  );
};

describe('SafeToSpendTile', () => {
  it('shows the amount left with its label, accessible name and Plan link', () => {
    renderTile();

    expect(screen.getByText('today.tiles.safeToSpend')).toHaveClass(
      'tile-label',
    );
    expect(screen.getByText('420')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAccessibleName(
      /today.tiles.safeToSpend.*420/,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/plan');
  });

  it('states an overspend once, shows its size and offers a recovery', () => {
    renderTile({
      status: 'tight',
      safeToSpend: -200,
      dailyAllowance: -16.67,
    });

    expect(
      screen.queryByText('today.tiles.safeToSpend'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('today.tiles.overBudget')).toHaveClass(
      'tile-badge',
    );
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.queryByText(/-200/)).not.toBeInTheDocument();
    expect(screen.queryByText('today.chip.tight')).not.toBeInTheDocument();
    expect(screen.getByText(/today.recovery/)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAccessibleName(
      /today.tiles.overBudget.*200/,
    );
  });

  it('keeps the chip when the label does not already carry the status', () => {
    renderTile({ status: 'watchful' });

    expect(screen.getByText('today.chip.watchful')).toBeInTheDocument();
  });

  it('shows spending so far without a budget, including in the accessible name', () => {
    renderTile({ status: 'noBudget', safeToSpend: null, dailyAllowance: null });

    expect(screen.getByText('today.spentSoFar')).toBeInTheDocument();
    expect(screen.getByText('580')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAccessibleName(/580/);
  });
});
