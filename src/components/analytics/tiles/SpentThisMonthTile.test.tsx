import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SpentThisMonthTile from '@/components/analytics/tiles/SpentThisMonthTile';

vi.mock('@/contexts/DataContext', () => ({
  useDataConfig: () => ({ defaultCurrency: 'EUR' }),
}));

vi.mock('@/hooks/useAnimatedNumber', () => ({
  useAnimatedNumber: (target: number) => target,
}));

const rhythmMonths = [
  { month: 'Jan', amount: 100 },
  { month: 'Feb', amount: 120 },
];

describe('SpentThisMonthTile', () => {
  it('labels an increase as a percentage compared with last month', () => {
    const { container } = render(
      <SpentThisMonthTile
        monthComparison={{
          thisMonthLabel: 'February 2026',
          lastMonthLabel: 'January 2026',
          thisMonthAmount: 146,
          lastMonthAmount: 100,
          delta: 46,
          percentChange: 46,
        }}
        rhythmMonths={rhythmMonths}
      />,
    );

    expect(screen.getByText('+46%')).toBeInTheDocument();
    expect(
      screen.getByText('analytics.tile.comparedWithLastMonth'),
    ).toBeInTheDocument();
    const comparison = screen.getByText('analytics.tile.comparedWithLastMonth');
    expect(comparison).toHaveClass('whitespace-normal');
    expect(comparison).not.toHaveClass('truncate');
    expect(comparison.closest('.flex-wrap')).toBeInTheDocument();
    expect(
      screen.getByText('analytics.tile.moreSpendingThanLastMonth'),
    ).toHaveClass('sr-only');
    expect(container.innerHTML).not.toContain('bg-destructive');
  });

  it('labels a decrease without relying on a green status treatment', () => {
    const { container } = render(
      <SpentThisMonthTile
        monthComparison={{
          thisMonthLabel: 'February 2026',
          lastMonthLabel: 'January 2026',
          thisMonthAmount: 75,
          lastMonthAmount: 100,
          delta: -25,
          percentChange: -25,
        }}
        rhythmMonths={rhythmMonths}
      />,
    );

    expect(screen.getByText('−25%')).toBeInTheDocument();
    expect(
      screen.getByText('analytics.tile.lessSpendingThanLastMonth'),
    ).toHaveClass('sr-only');
    expect(container.innerHTML).not.toContain('bg-income');
  });
});
