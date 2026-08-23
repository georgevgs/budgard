import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import SafeToSpendTile from '@/components/today/tiles/SafeToSpendTile';
import type { TodayStatus } from '@/hooks/today/useTodayGuidance';

type Overrides = Partial<React.ComponentProps<typeof SafeToSpendTile>>;

const renderTile = (overrides: Overrides = {}) => {
  return render(
    <MemoryRouter>
      <SafeToSpendTile
        status={'comfortable' satisfies TodayStatus}
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
  it('names the figure "safe to spend" while there is something left', () => {
    renderTile();

    expect(screen.getByText('today.tiles.safeToSpend')).toBeInTheDocument();
    expect(screen.getByText('420')).toBeInTheDocument();
  });

  it('keeps the label a quiet eyebrow in every ordinary state', () => {
    renderTile();

    expect(screen.getByText('today.tiles.safeToSpend')).toHaveClass(
      'tile-label',
    );
  });

  // The slab is the one figure the screen exists to answer, and a minus sign
  // is the whole difference between "you have 200" and "you owe 200". At the
  // slab's size it is also the easiest glyph on the screen to miss, so the
  // direction is carried by the label instead — which used to go on reading
  // "Safe to spend" over a negative number.
  describe('past the budget', () => {
    const overspent: Overrides = {
      status: 'tight',
      safeToSpend: -200,
      dailyAllowance: -16.67,
    };

    it('never labels a negative figure as safe to spend', () => {
      renderTile(overspent);

      expect(
        screen.queryByText('today.tiles.safeToSpend'),
      ).not.toBeInTheDocument();
      expect(screen.getByText('today.tiles.overBudget')).toBeInTheDocument();
    });

    // The slab is the brand fill in both states, so the eyebrow was the only
    // thing separating them and it is the quietest element on the tile. Over
    // budget it is drawn as an inverted badge instead.
    it('states it as a badge rather than as a quiet eyebrow', () => {
      renderTile(overspent);

      expect(screen.getByText('today.tiles.overBudget')).toHaveClass(
        'tile-badge',
      );
    });

    it('shows the size of the overspend rather than a signed balance', () => {
      renderTile(overspent);

      expect(screen.getByText('200')).toBeInTheDocument();
      expect(screen.queryByText(/-200/)).not.toBeInTheDocument();
    });

    // The chip and the label would otherwise say the same thing at the same
    // moment: `tight` is reached only when safeToSpend is negative.
    it('drops the status chip the label has already made redundant', () => {
      renderTile(overspent);

      expect(screen.queryByText('today.chip.tight')).not.toBeInTheDocument();
    });

    it('offers a way forward instead of only a verdict', () => {
      renderTile(overspent);

      expect(screen.getByText(/today.recovery/)).toBeInTheDocument();
    });
  });

  it('keeps the chip in every state the label does not already carry', () => {
    renderTile({ status: 'watchful' });

    expect(screen.getByText('today.chip.watchful')).toBeInTheDocument();
  });

  it('falls back to what has been spent when there is no budget', () => {
    renderTile({ status: 'noBudget', safeToSpend: null, dailyAllowance: null });

    expect(screen.getByText('today.spentSoFar')).toBeInTheDocument();
    expect(screen.getByText('580')).toBeInTheDocument();
  });
});
