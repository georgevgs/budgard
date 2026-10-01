import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { NetWorthSummary } from '@/common/hooks/useNetWorth';

vi.mock('@/common/hooks/useAnimatedNumber', () => ({
  useAnimatedNumber: (value: number) => value,
}));

import { NetWorthHeader } from '@/pages/networth/components/NetWorthHeader';

describe('NetWorthHeader', () => {
  it('withholds combined figures when a foreign-currency rate is missing', () => {
    const summary: NetWorthSummary = {
      total: 42000,
      assets: 50000,
      liabilities: 8000,
      debts: 0,
      byKind: {},
      investmentValue: 0,
      investmentCostBasis: 0,
      investmentGain: 0,
      staleCurrencies: ['JPY'],
      spendableBalance: null,
    };

    render(<NetWorthHeader summary={summary} defaultCurrency="EUR" />);

    expect(screen.queryByText('42.000,00€')).not.toBeInTheDocument();
    expect(screen.queryByText('50.000,00€')).not.toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(screen.getByText('networth.staleRatesWarning')).toBeInTheDocument();
  });
});
