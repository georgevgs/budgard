import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

// The footnote's legal links need a router in scope.
const renderDialog = () =>
  render(
    <MemoryRouter>
      <UpgradeDialog />
    </MemoryRouter>,
  );

describe('UpgradeDialog', () => {
  it('shows both plan cards with the yearly plan selected by default', () => {
    renderDialog();

    expect(screen.getByText('pro.heroTitle')).toBeInTheDocument();
    expect(screen.getByText('€1.66')).toBeInTheDocument();
    expect(screen.getByText('€1.99')).toBeInTheDocument();

    const yearlyCard = screen.getByRole('radio', { checked: true });
    expect(yearlyCard).toHaveTextContent('pro.yearly');
  });

  it('advertises the yearly saving and billing total on the yearly card', () => {
    renderDialog();

    // 199 vs floor(1999 / 12) = 166 → 17% off the monthly price.
    expect(screen.getByText('pro.savePercent')).toBeInTheDocument();
    expect(screen.getByText('pro.billedYearly')).toBeInTheDocument();
  });

  it('starts checkout with the default yearly plan', async () => {
    startCheckoutMock.mockResolvedValue('https://checkout.example/session');
    renderDialog();

    fireEvent.click(screen.getByText('pro.cta'));

    await waitFor(() => {
      expect(startCheckoutMock).toHaveBeenCalledWith('yearly');
    });
  });

  it('starts checkout with monthly after selecting the monthly card', async () => {
    startCheckoutMock.mockResolvedValue('https://checkout.example/session');
    renderDialog();

    fireEvent.click(screen.getByText('pro.monthly'));
    fireEvent.click(screen.getByText('pro.cta'));

    await waitFor(() => {
      expect(startCheckoutMock).toHaveBeenCalledWith('monthly');
    });
  });

  it('lists the full Pro feature set including early access', () => {
    renderDialog();

    expect(screen.getByText('pro.features.f1')).toBeInTheDocument();
    expect(screen.getByText('pro.features.f5')).toBeInTheDocument();
    expect(screen.getByText('pro.features.f6')).toBeInTheDocument();
  });

  it('links to the legal pages and closes the dialog on the way out', () => {
    renderDialog();

    const termsLink = screen.getByText('pro.legal.terms');
    expect(termsLink).toHaveAttribute('href', '/terms');

    fireEvent.click(termsLink);
    expect(closeUpgradeMock).toHaveBeenCalled();
  });
});
