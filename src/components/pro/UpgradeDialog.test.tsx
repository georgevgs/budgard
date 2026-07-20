import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UpgradeDialog from '@/components/pro/UpgradeDialog';

const startCheckoutMock = vi.fn();
const closeUpgradeMock = vi.fn();

// jsdom cannot navigate; replace location so the redirect after checkout
// creation is observable instead of throwing.
Object.defineProperty(window, 'location', {
  value: { ...window.location, assign: vi.fn() },
  writable: true,
});

vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({
    subscription: null,
    isPro: false,
    isLoading: false,
    refresh: vi.fn(),
    startCheckout: startCheckoutMock,
  }),
}));

vi.mock('@/contexts/UpgradeDialogContext', () => ({
  useUpgradeDialog: () => ({
    isUpgradeOpen: true,
    preferredPlan: 'yearly',
    openUpgrade: vi.fn(),
    closeUpgrade: closeUpgradeMock,
  }),
}));

describe('UpgradeDialog', () => {
  it('shows the yearly plan by default with both prices', () => {
    render(<UpgradeDialog />);

    expect(screen.getByText('pro.upgradeTitle')).toBeInTheDocument();
    expect(screen.getByText('€1.66')).toBeInTheDocument();
    expect(screen.getByText('pro.billedYearly')).toBeInTheDocument();
  });

  it('switches to monthly pricing', () => {
    render(<UpgradeDialog />);

    fireEvent.click(screen.getByText('pro.monthly'));

    expect(screen.getByText('€1.99')).toBeInTheDocument();
  });

  it('starts checkout with the selected plan', async () => {
    startCheckoutMock.mockResolvedValue('https://checkout.example/session');
    render(<UpgradeDialog />);

    fireEvent.click(screen.getByText('pro.cta'));

    await waitFor(() => {
      expect(startCheckoutMock).toHaveBeenCalledWith('yearly');
    });
  });

  it('lists the Pro feature set', () => {
    render(<UpgradeDialog />);

    expect(screen.getByText('pro.features.f1')).toBeInTheDocument();
    expect(screen.getByText('pro.features.f5')).toBeInTheDocument();
  });
});
