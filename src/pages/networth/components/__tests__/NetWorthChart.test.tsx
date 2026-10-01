import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/common/hooks/useDateLocale', () => ({
  useDateLocale: () => undefined,
}));
vi.mock('@/common/components/charts/CartesianChart', () => ({
  CartesianChart: ({ formatY }: { formatY: (value: number) => string }) => (
    <div data-testid="negative-axis-tick">{formatY(-500)}</div>
  ),
}));

import { NetWorthChart } from '@/pages/networth/components/NetWorthChart';

describe('NetWorthChart', () => {
  it('keeps the minus sign on negative axis ticks', () => {
    render(
      <NetWorthChart
        series={[
          { date: '2026-08-01', total: -500, assets: 0, liabilities: 500 },
          { date: '2026-08-02', total: -400, assets: 100, liabilities: 500 },
        ]}
        defaultCurrency="EUR"
      />,
    );

    expect(screen.getByTestId('negative-axis-tick')).toHaveTextContent('-500€');
  });
});
