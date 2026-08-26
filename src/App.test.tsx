import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';

const authState = vi.hoisted(() => ({
  session: null as { user: { id: string } } | null,
  isLoading: false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    ...authState,
    isAuthenticated: authState.session !== null,
  }),
}));

vi.mock('@/hooks/usePwaUpdate', () => ({
  usePwaUpdate: vi.fn(),
}));

vi.mock('@/AuthenticatedApp', () => ({
  default: () => <div>authenticated application</div>,
}));

vi.mock('@/components/today/TodayView', () => ({
  default: () => <div>today view</div>,
}));

vi.mock('@/pages/LandingPage', () => ({
  default: () => <div>public landing page</div>,
}));

vi.mock('@/components/common/RouteMetadata', () => ({
  default: () => null,
}));

vi.mock('@/components/common/OfflineBanner', () => ({
  default: () => null,
}));

vi.mock('@/components/ui/toaster', () => ({
  Toaster: () => null,
}));

vi.mock('@/components/ui/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/components/expenses/ExpensesLoading', () => ({
  AppLoadingSkeleton: () => <div>authenticated loading</div>,
}));

vi.mock('@/components/landing/LandingLoading', () => ({
  default: () => <div>public loading</div>,
}));

describe('App boundary', () => {
  beforeEach(() => {
    authState.session = null;
    authState.isLoading = false;
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

  it('uses the authenticated skeleton while a private route checks auth', () => {
    authState.isLoading = true;
    window.history.replaceState({}, '', '/expenses');

    render(<App />);

    expect(screen.getByText('authenticated loading')).toBeInTheDocument();
  });
});
