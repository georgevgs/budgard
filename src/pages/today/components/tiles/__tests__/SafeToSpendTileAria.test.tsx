import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SafeToSpendTile } from '@/pages/today/components/tiles/SafeToSpendTile';

// The shared mock returns bare keys, which cannot show whether a value made
// it into the label. This one spells the values out.
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

const accessibleName = (overrides: Overrides): string => {
  render(
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

  return screen.getByRole('link').getAttribute('aria-label') ?? '';
};

// The aria-label replaces the tile's content for a screen reader. It used to
// name the tile and nothing else, so the headline figure was never read out.
describe('SafeToSpendTile accessible name', () => {
  it('carries the amount left', () => {
    const name = accessibleName({});

    expect(name).toContain('420');
    expect(name).toContain('today.tiles.safeToSpend');
  });

  it('carries the size of an overspend', () => {
    const name = accessibleName({ status: 'tight', safeToSpend: -200 });

    expect(name).toContain('today.tiles.overBudget');
    expect(name).toContain('200');
  });

  it('carries what has been spent when there is no budget', () => {
    const name = accessibleName({ status: 'noBudget', safeToSpend: null });

    expect(name).toContain('580');
  });
});
