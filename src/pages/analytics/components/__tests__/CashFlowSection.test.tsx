import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/common/contexts/DataContext', () => ({
  useDataConfig: () => ({ monthlyBudget: null, defaultCurrency: 'EUR' }),
}));
vi.mock('@/pages/analytics/hooks/useCashFlowData', () => ({
  useCashFlowData: () => ({
    monthlyData: [],
    yearTotals: { totalIncome: 0, totalExpense: 0, net: 0, avgNet: 0 },
  }),
}));
vi.mock('@/pages/analytics/hooks/useMoneyFlowData', () => ({
  useMoneyFlowData: () => ({
    monthLabel: 'August 2026',
    income: 0,
    totalExpenses: 0,
    savings: 0,
    categories: [],
    isDeficit: false,
    hasData: false,
  }),
}));
vi.mock('@/common/hooks/useCurrentDate', () => ({
  useCurrentDate: () => new Date(2026, 7, 15),
}));
vi.mock('@/common/hooks/useAnimatedNumber', () => ({
  useAnimatedNumber: (amount: number) => amount,
}));

import { CashFlowSection } from '@/pages/analytics/components/CashFlowSection';

describe('CashFlowSection', () => {
  it('opens the calendar month selected from a partial-year series', () => {
    const onMonthClick = vi.fn();
    render(
      <CashFlowSection
        selectedYear={2026}
        isPro={false}
        monthlyData={[
          { month: 'Mar', fullMonth: 'March 2026', monthIndex: 2, amount: 10 },
          { month: 'Apr', fullMonth: 'April 2026', monthIndex: 3, amount: 20 },
        ]}
        yAxisMax={undefined}
        totalSpent={30}
        monthlyAverage={15}
        monthsElapsed={2}
        onMonthClick={onMonthClick}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: '3' },
    });
    expect(onMonthClick).toHaveBeenCalledWith(3);
  });
});
