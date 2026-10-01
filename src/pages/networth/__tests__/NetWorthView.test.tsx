import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account } from '@/types/Account';

const state = vi.hoisted(() => ({
  isComputing: true,
  staleCurrencies: [] as string[],
  missingHistoryCurrencies: [] as string[],
}));

const account = {
  id: 'account-1',
  kind: 'cash',
} as Account;

vi.mock('@/common/contexts/DataContext', () => ({
  useDataConfig: () => ({
    defaultCurrency: 'EUR',
    isInitialized: true,
    isSecondaryLoaded: true,
  }),
}));

vi.mock('@/common/hooks/useNetWorth', () => ({
  useNetWorth: () => ({
    summary: { total: 100, debts: 0, staleCurrencies: state.staleCurrencies },
    series: [],
    isComputing: state.isComputing,
    missingHistoryCurrencies: state.missingHistoryCurrencies,
  }),
}));

vi.mock('@/common/hooks/useProGate', () => ({
  useProGate: () => ({ isPro: false, allow: vi.fn(() => true) }),
}));

vi.mock('@/pages/networth/hooks/useGroupedAccounts', () => ({
  useGroupedAccounts: () => ({
    accounts: [account],
    grouped: { assets: [account], investments: [], liabilities: [] },
    latestSnapshotByAccount: new Map(),
  }),
}));

vi.mock('@/common/components/onDemandData/OnDemandData', () => ({
  OnDemandData: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/pages/networth/components/NetWorthHeader', () => ({
  NetWorthHeader: () => <div>net-worth-headline</div>,
}));

vi.mock('@/pages/networth/components/NetWorthChart', () => ({
  NetWorthChart: () => <div>net-worth-chart</div>,
}));

vi.mock('@/pages/networth/components/AccountGroup', () => ({
  AccountGroup: () => null,
}));

vi.mock('@/common/components/common/PageHeader', () => ({
  PageHeader: () => <div>page-header</div>,
}));

import NetWorthView from '@/pages/networth/NetWorthView';

describe('NetWorthView', () => {
  beforeEach(() => {
    state.isComputing = true;
    state.staleCurrencies = [];
    state.missingHistoryCurrencies = [];
  });

  it('withholds the headline until currency conversion is complete', () => {
    const view = render(<NetWorthView />);

    expect(screen.getByRole('status')).toHaveTextContent('common.loading');
    expect(screen.queryByText('net-worth-headline')).not.toBeInTheDocument();

    state.isComputing = false;
    view.rerender(<NetWorthView />);

    expect(screen.getByText('net-worth-headline')).toBeInTheDocument();
  });

  it('hides a chart built from missing exchange rates', () => {
    state.isComputing = false;
    state.staleCurrencies = ['JPY'];
    const view = render(<NetWorthView />);

    expect(screen.queryByText('net-worth-chart')).not.toBeInTheDocument();

    state.staleCurrencies = [];
    view.rerender(<NetWorthView />);
    expect(screen.getByText('net-worth-chart')).toBeInTheDocument();
  });

  it('explains when a historical rate is missing but the current rate is available', () => {
    state.isComputing = false;
    state.missingHistoryCurrencies = ['USD'];

    render(<NetWorthView />);

    expect(screen.getByText('net-worth-headline')).toBeInTheDocument();
    expect(screen.queryByText('net-worth-chart')).not.toBeInTheDocument();
    expect(
      screen.getByText('networth.chart.historyRatesUnavailable'),
    ).toBeInTheDocument();
  });
});
