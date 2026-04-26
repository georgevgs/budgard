import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';

const triggerAndroidInstall = vi.fn();
let installState = {
  isIosSafari: false,
  isAndroidInstallable: false,
  isStandalone: false,
  triggerAndroidInstall,
};

vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => installState,
}));

vi.mock('@/components/landing/Reveal', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/landing/IosInstallModal', () => ({
  IosInstallModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="ios-modal" /> : null,
}));

vi.mock('@/components/landing/DeviceFrame', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import Hero from './Hero';

describe('Hero', () => {
  it('renders the primary CTA and forwards clicks', () => {
    installState = { ...installState, isStandalone: true };
    const onGetStarted = vi.fn();
    render(<Hero onGetStarted={onGetStarted} />);

    fireEvent.click(screen.getByText('landing.hero.primaryCta'));
    expect(onGetStarted).toHaveBeenCalledOnce();
  });

  it('hides the install button when running standalone', () => {
    installState = {
      isIosSafari: true,
      isAndroidInstallable: true,
      isStandalone: true,
      triggerAndroidInstall,
    };
    render(<Hero onGetStarted={vi.fn()} />);

    expect(screen.queryByText('landing.hero.installCta')).not.toBeInTheDocument();
  });

  it('shows the install button on Android and triggers install on click', () => {
    installState = {
      isIosSafari: false,
      isAndroidInstallable: true,
      isStandalone: false,
      triggerAndroidInstall,
    };
    render(<Hero onGetStarted={vi.fn()} />);

    fireEvent.click(screen.getByText('landing.hero.installCta'));
    expect(triggerAndroidInstall).toHaveBeenCalledOnce();
  });

  it('opens the iOS modal instead of triggering install on iOS Safari', () => {
    installState = {
      isIosSafari: true,
      isAndroidInstallable: false,
      isStandalone: false,
      triggerAndroidInstall,
    };
    render(<Hero onGetStarted={vi.fn()} />);

    fireEvent.click(screen.getByText('landing.hero.installCta'));

    expect(screen.getByTestId('ios-modal')).toBeInTheDocument();
    expect(triggerAndroidInstall).not.toHaveBeenCalled();
  });

  it('hides install button on a desktop browser', () => {
    installState = {
      isIosSafari: false,
      isAndroidInstallable: false,
      isStandalone: false,
      triggerAndroidInstall,
    };
    render(<Hero onGetStarted={vi.fn()} />);

    expect(screen.queryByText('landing.hero.installCta')).not.toBeInTheDocument();
  });
});
