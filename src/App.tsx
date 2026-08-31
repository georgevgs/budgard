import { Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePwaUpdate } from '@/hooks/usePwaUpdate';
import { useTheme } from '@/hooks/useTheme';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { AppLoadingSkeleton } from '@/components/expenses/ExpensesLoading';
import LandingLoadingState from '@/components/landing/LandingLoading';
import LegalLoadingState from '@/pages/legal/LegalLoading';
import RouteMetadata from '@/components/common/RouteMetadata';
import OfflineBanner from '@/components/common/OfflineBanner';

// On a cache-repair launch every JavaScript chunk has to come from the network.
// Load the authenticated shell and the initial tab together so the user sees
// one stable app skeleton, rather than shell skeleton -> tab skeleton -> data.
// The route remains a dynamic import and therefore stays lazy for signed-out
// visitors and for every tab other than the one being opened.
const AuthenticatedApp = lazyWithRetry(() => loadAuthenticatedApp());
const LandingPage = lazyWithRetry(() => import('@/pages/LandingPage'));
const PrivacyPage = lazyWithRetry(() => import('@/pages/legal/PrivacyPage'));
const TermsPage = lazyWithRetry(() => import('@/pages/legal/TermsPage'));
const ContactPage = lazyWithRetry(() => import('@/pages/legal/ContactPage'));

const App = () => {
  usePwaUpdate();
  useTheme();
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return renderAuthLoading(window.location.pathname);
  }
  if (session) {
    return (
      <Suspense fallback={<AppLoadingSkeleton />}>
        <AuthenticatedApp />
      </Suspense>
    );
  }

  return <PublicApp />;
};

export default App;

// --- Public application ---

const PublicApp = () => {
  return (
    <BrowserRouter>
      <RouteMetadata />
      <div className="min-h-dvh bg-background flex flex-col">
        <ErrorBoundary>
          <Routes>
            <Route
              path="/"
              element={
                <Suspense fallback={<LandingLoadingState />}>
                  <LandingPage />
                </Suspense>
              }
            />
            <Route path="/privacy" element={renderLegalPage(<PrivacyPage />)} />
            <Route path="/terms" element={renderLegalPage(<TermsPage />)} />
            <Route path="/contact" element={renderLegalPage(<ContactPage />)} />
            <Route
              path="/join"
              element={
                <Suspense fallback={<LandingLoadingState />}>
                  <LandingPage />
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
        <OfflineBanner />
        <Toaster />
      </div>
    </BrowserRouter>
  );
};

// --- Helpers ---

const loadAuthenticatedApp = async () => {
  const app = import('@/AuthenticatedApp');
  const initialTab = loadInitialTab(window.location.pathname);
  await Promise.all([app, initialTab]);

  return app;
};

const renderLegalPage = (page: ReactNode) => {
  return (
    <main className="flex-1">
      <Suspense fallback={<LegalLoadingState />}>{page}</Suspense>
    </main>
  );
};

const renderAuthLoading = (pathname: string) => {
  if (pathname === '/') return <LandingLoadingState />;
  if (isLegalPath(pathname)) return <LegalLoadingState />;

  return <AppLoadingSkeleton />;
};

const isLegalPath = (pathname: string): boolean => {
  return ['/privacy', '/terms', '/contact'].includes(pathname);
};

const loadInitialTab = (pathname: string): Promise<unknown> => {
  // Installed PWAs start at `/`; the authenticated router immediately sends
  // that route to Today, so it is the initial tab too.
  if (pathname === '/' || pathname === '/today' || pathname === '/expenses') {
    return import('@/components/today/TodayView');
  }
  if (pathname === '/activity' || pathname === '/income') {
    return import('@/components/activity/ActivityView');
  }
  if (pathname === '/plan') {
    return import('@/components/plan/PlanView');
  }
  if (pathname === '/trends' || pathname === '/analytics') {
    return import('@/components/analytics/AnalyticsView');
  }

  return Promise.resolve();
};
