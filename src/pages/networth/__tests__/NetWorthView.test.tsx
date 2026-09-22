import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account } from '@/types/Account';

const state = vi.hoisted(() => ({ isComputing: true }));

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
    summary: { total: 100, debts: 0 },
    series: [],
    isComputing: state.isComputing,
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
  NetWorthChart: () => null,
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
  });

  it('withholds the headline until currency conversion is complete', () => {
    const view = render(<NetWorthView />);

    expect(screen.getByRole('status')).toHaveTextContent('common.loading');
    expect(screen.queryByText('net-worth-headline')).not.toBeInTheDocument();

    state.isComputing = false;
    view.rerender(<NetWorthView />);

    expect(screen.getByText('net-worth-headline')).toBeInTheDocument();
  });
});
