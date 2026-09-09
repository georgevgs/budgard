import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '@/App';

const authState = vi.hoisted(() => ({
  session: null as { user: { id: string } } | null,
  isLoading: false,
}));

// Read through a getter so a test can swap in a bundle that never lands and
// see what the app draws while it is still in flight.
const i18nState = vi.hoisted(() => ({
  ready: Promise.resolve() as Promise<void>,
}));

vi.mock('@/config/i18n', () => ({
  get i18nReady() {
    return i18nState.ready;
  },
  changeAppLanguage: vi.fn(),
}));

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({
    ...authState,
    isAuthenticated: authState.session !== null,
  }),
}));

vi.mock('@/common/hooks/usePwaUpdate', () => ({
  usePwaUpdate: vi.fn(),
}));

vi.mock('@/AuthenticatedApp', () => ({
  default: () => <div>authenticated application</div>,
}));

vi.mock('@/pages/today/TodayView', () => ({
  default: () => <div>today view</div>,
}));

vi.mock('@/pages/landing/LandingPage', () => ({
  default: () => <div>public landing page</div>,
}));

vi.mock('@/common/components/common/RouteMetadata', () => ({ RouteMetadata: () => null,
}));

vi.mock('@/common/components/common/OfflineBanner', () => ({ OfflineBanner: () => null,
}));

vi.mock('@/common/ui/toaster', () => ({
  Toaster: () => null,
}));

vi.mock('@/common/ui/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/common/components/common/AppLoadingSkeleton', () => ({
  AppLoadingSkeleton: () => <div>authenticated loading</div>,
}));

vi.mock('@/pages/landing/components/LandingLoading', () => ({ LandingLoading: () => <div>public loading</div>,
}));

describe('App boundary', () => {
  beforeEach(() => {
    authState.session = null;
    authState.isLoading = false;
    i18nState.ready = Promise.resolve();
    window.history.replaceState({}, '', '/');
  });

  it('loads only the public application for signed-out visitors', async () => {
    render(<App />);

    expect(await screen.findByText('public landing page')).toBeInTheDocument();
    expect(
      screen.queryByText('authenticated application'),
    ).not.toBeInTheDocument();
  });

  it('loads the authenticated application when a session exists', async () => {
    authState.session = { user: { id: 'user-1' } };

    render(<App />);

    expect(
      await screen.findByText('authenticated application'),
    ).toBeInTheDocument();
    expect(screen.queryByText('public landing page')).not.toBeInTheDocument();
  });

  // React mounts before the translations land so the two resolve in parallel.
  // The skeleton is what stands in until then — without it the first paint
  // would be the UI with every string showing its raw key.
  it('holds the loading skeleton until the translations arrive', () => {
    i18nState.ready = new Promise<void>(() => {});
    authState.session = { user: { id: 'user-1' } };
    window.history.replaceState({}, '', '/today');

    render(<App />);

    expect(screen.getByText('authenticated loading')).toBeInTheDocument();
    expect(
      screen.queryByText('authenticated application'),
    ).not.toBeInTheDocument();
  });

  it('uses the authenticated skeleton while a private route checks auth', () => {
    authState.isLoading = true;
    window.history.replaceState({}, '', '/expenses');

    render(<App />);

    expect(screen.getByText('authenticated loading')).toBeInTheDocument();
  });
});
