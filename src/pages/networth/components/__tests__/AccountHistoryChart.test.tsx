import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';

vi.mock('@/common/hooks/useDateLocale', () => ({
  useDateLocale: () => undefined,
}));
vi.mock('@/common/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({ isPro: false }),
}));
vi.mock('@/common/components/charts/CartesianChart', () => ({
  CartesianChart: ({ formatY }: { formatY: (value: number) => string }) => (
    <div data-testid="negative-axis-tick">{formatY(-500)}</div>
  ),
}));

import { AccountHistoryChart } from '@/pages/networth/components/AccountHistoryChart';

describe('AccountHistoryChart', () => {
  it('keeps the minus sign on negative account-balance ticks', () => {
    const account = {
      id: 'account-1',
      kind: 'bank',
      default_currency: 'EUR',
    } as Account;
    const snapshots = [
      { account_id: 'account-1', recorded_at: '2026-08-01', balance: -500 },
      { account_id: 'account-1', recorded_at: '2026-08-02', balance: -400 },
    ] as AccountBalance[];

    render(<AccountHistoryChart account={account} snapshots={snapshots} />);

    expect(screen.getByTestId('negative-axis-tick')).toHaveTextContent('-500€');
  });
});
