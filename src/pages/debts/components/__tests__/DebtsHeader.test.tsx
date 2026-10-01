import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DebtSummary } from '@/common/hooks/useDebts';

vi.mock('@/common/hooks/useAnimatedNumber', () => ({
  useAnimatedNumber: (value: number) => value,
}));

import { DebtsHeader } from '@/pages/debts/components/DebtsHeader';

const baseSummary: DebtSummary = {
  totalBalance: 100,
  totalOriginalPrincipal: 100,
  totalMinimumPayment: 10,
  weightedAverageApr: 5,
  currency: 'USD',
  hasMixedCurrencies: false,
  balanceByCurrency: { USD: 100 },
  minimumByCurrency: { USD: 10 },
  activeCount: 1,
  completedCount: 0,
};

describe('DebtsHeader', () => {
  it('labels a single-currency balance in the debt currency', () => {
    render(
      <DebtsHeader
        summary={baseSummary}
        defaultCurrency="EUR"
        monthsToDebtFree={null}
        payoffDate={null}
      />,
    );

    expect(screen.getByText('100,00$')).toBeInTheDocument();
    expect(screen.queryByText('100,00€')).not.toBeInTheDocument();
  });

  it('shows separate amounts instead of a fabricated mixed-currency total', () => {
    const summary: DebtSummary = {
      ...baseSummary,
      totalBalance: null,
      totalOriginalPrincipal: null,
      totalMinimumPayment: null,
      weightedAverageApr: null,
      currency: null,
      hasMixedCurrencies: true,
      balanceByCurrency: { EUR: 100, JPY: 20000 },
      minimumByCurrency: { EUR: 10, JPY: 2000 },
      activeCount: 2,
    };
    render(
      <DebtsHeader
        summary={summary}
        defaultCurrency="EUR"
        monthsToDebtFree={10}
        payoffDate="2027-06-01"
      />,
    );

    expect(screen.getByText('100,00€')).toBeInTheDocument();
    expect(screen.getByText('20.000¥')).toBeInTheDocument();
    expect(screen.queryByText('0,00€')).not.toBeInTheDocument();
    expect(screen.queryByText('debts.debtFreeIn')).not.toBeInTheDocument();
  });
});
