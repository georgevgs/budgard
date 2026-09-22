import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  subscriptionLoading: true,
  spaceLoading: false,
  spaceError: null as Error | null,
}));
const refreshShares = vi.hoisted(() => vi.fn());

vi.mock('@/common/contexts/SubscriptionProvider', () => ({
  SubscriptionProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/common/contexts/UpgradeDialogProvider', () => ({
  UpgradeDialogProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/common/contexts/FinancialSpaceProvider', () => ({
  FinancialSpaceProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/common/contexts/FinancialSpaceContext', () => ({
  useFinancialSpace: () => ({
    activeOwnerId: 'owner-1',
    isLoading: state.spaceLoading,
    error: state.spaceError,
    refreshShares,
  }),
}));

vi.mock('@/common/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({ isLoading: state.subscriptionLoading }),
}));

vi.mock('@/common/contexts/DataProvider', () => ({
  DataProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="data-provider">{children}</div>
  ),
}));

vi.mock('@/common/components/common/AppLoadingSkeleton', () => ({
  AppLoadingSkeleton: () => <div>app-loading</div>,
}));

import { AuthenticatedProviders } from '@/common/contexts/AuthenticatedProviders';

const renderProviders = () =>
  render(
    <AuthenticatedProviders>
      <div>private-route</div>
    </AuthenticatedProviders>,
  );

describe('AuthenticatedProviders', () => {
  beforeEach(() => {
    state.subscriptionLoading = true;
    state.spaceLoading = false;
    state.spaceError = null;
    refreshShares.mockReset();
  });

  it('loads data in parallel without rendering routes against an unknown plan', () => {
    const view = renderProviders();

    expect(screen.getByTestId('data-provider')).toBeInTheDocument();
    expect(screen.getByText('app-loading')).toBeInTheDocument();
    expect(screen.queryByText('private-route')).not.toBeInTheDocument();

    state.subscriptionLoading = false;
    view.rerender(
      <AuthenticatedProviders>
        <div>private-route</div>
      </AuthenticatedProviders>,
    );

    expect(screen.getByText('private-route')).toBeInTheDocument();
  });

  it('withholds routes while the saved household space is validated', () => {
    state.subscriptionLoading = false;
    state.spaceLoading = true;

    renderProviders();

    expect(screen.getByText('app-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('data-provider')).not.toBeInTheDocument();
    expect(screen.queryByText('private-route')).not.toBeInTheDocument();
  });

  it('offers a retry without opening an unverified data session', () => {
    state.subscriptionLoading = false;
    state.spaceError = new Error('network unavailable');

    renderProviders();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'common.loadDataFailed',
    );
    expect(screen.queryByTestId('data-provider')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.tryAgain' }));
    expect(refreshShares).toHaveBeenCalledOnce();
  });
});
