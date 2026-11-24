import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AnnualExportSection } from '@/pages/settings/components/AnnualExportSection';

const state = vi.hoisted(() => ({
  isInitialized: true,
  isHistoryLoaded: false,
  hasHistoryLoadError: false,
  isPro: true,
  expenses: [{ date: '2025-12-01' }],
}));
const loadHistory = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('@/common/contexts/DataContext', () => ({
  useDataActions: () => ({ loadHistory }),
  useDataConfig: () => state,
  useExpensesData: () => state.expenses,
  useIncomesData: () => [],
}));

vi.mock('@/common/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({ isPro: state.isPro }),
}));

vi.mock('@/pages/settings/components/AnnualExportCard', () => ({
  AnnualExportCard: () => <button type="button">Download report</button>,
}));

vi.mock('@/common/components/pro/ProUpsellCard', () => ({
  ProUpsellCard: ({ title }: { title: string }) => <p>{title}</p>,
}));

describe('Annual exports', () => {
  beforeEach(() => {
    state.isHistoryLoaded = false;
    state.hasHistoryLoadError = false;
    state.isPro = true;
    loadHistory.mockClear();
  });

  it('waits for full history even if a year is already visible in the recent ledger', () => {
    const view = render(<AnnualExportSection />);

    expect(
      screen.queryByRole('button', { name: 'Download report' }),
    ).not.toBeInTheDocument();
    expect(loadHistory).toHaveBeenCalledOnce();

    state.isHistoryLoaded = true;
    view.rerender(<AnnualExportSection />);

    expect(
      screen.getByRole('button', { name: 'Download report' }),
    ).toBeInTheDocument();
  });

  it('offers retry and withholds reports when an older history request fails', () => {
    state.isHistoryLoaded = true;
    state.hasHistoryLoadError = true;
    render(<AnnualExportSection />);

    expect(
      screen.queryByRole('button', { name: 'Download report' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.tryAgain' }));
    expect(loadHistory).toHaveBeenCalledOnce();
  });

  it('keeps the Pro offer and avoids a history request on the free plan', () => {
    state.isPro = false;
    render(<AnnualExportSection />);

    expect(screen.getByText('pro.gate.annualExportTitle')).toBeInTheDocument();
    expect(loadHistory).not.toHaveBeenCalled();
  });
});
