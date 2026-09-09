import { Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/common/contexts/AuthContext';
import { useI18nReady } from '@/common/hooks/useI18nReady';
import { usePwaUpdate } from '@/common/hooks/usePwaUpdate';
import { useTheme } from '@/common/hooks/useTheme';
import { lazyWithRetry } from '@/constants/lazyWithRetry';
import { ErrorBoundary } from '@/common/ui/error-boundary';
import { AppLoadingSkeleton } from '@/common/components/common/AppLoadingSkeleton';
import { LandingLoading } from '@/pages/landing/components/LandingLoading';
import { LegalLoading } from '@/pages/legal/LegalLoading';
import { RouteMetadata } from '@/common/components/common/RouteMetadata';
import { OfflineBanner } from '@/common/components/common/OfflineBanner';

// On a cache-repair launch every JavaScript chunk has to come from the network.
// Load the authenticated shell and the initial tab together so the user sees
// one stable app skeleton, rather than shell skeleton -> tab skeleton -> data.
// The route remains a dynamic import and therefore stays lazy for signed-out
// visitors and for every tab other than the one being opened.
const AuthenticatedApp = lazyWithRetry(() => loadAuthenticatedApp());
const AppToaster = lazyWithRetry(
  () => import('@/common/components/common/AppToaster'),
);
const LandingPage = lazyWithRetry(() => import('@/pages/landing/LandingPage'));
const PrivacyPage = lazyWithRetry(() => import('@/pages/legal/PrivacyPage'));
const TermsPage = lazyWithRetry(() => import('@/pages/legal/TermsPage'));
const ContactPage = lazyWithRetry(() => import('@/pages/legal/ContactPage'));

export const App = () => {
  usePwaUpdate();
  useTheme();
  const { session, isLoading } = useAuth();
  const isI18nReady = useI18nReady();

  usePrefetchAuthenticatedShell(Boolean(session));

  // React mounts before the translations arrive, so this holds the same
  // skeleton it always did until both the session and the bundle are in.
  // Waiting on i18n here rather than around createRoot is what lets the two
  // resolve at the same time instead of one after the other.
  if (isLoading || !isI18nReady) {
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
                <Suspense fallback={<LandingLoading />}>
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
                <Suspense fallback={<LandingLoading />}>
                  <LandingPage />
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
        <OfflineBanner />
        <Suspense fallback={null}>
          <AppToaster />
        </Suspense>
      </div>
    </BrowserRouter>
  );
};

// <AuthenticatedApp> only renders once the skeleton above is done, so without
// this its chunk could not start downloading until the translations had landed
// too. Knowing there is a session is enough to start fetching it.
const usePrefetchAuthenticatedShell = (hasSession: boolean) => {
  useEffect(() => {
    if (!hasSession) {
      return;
    }
    loadAuthenticatedApp().catch(() => {
      // The lazy boundary owns the real failure path (reset.html recovery).
    });
  }, [hasSession]);
};

const loadAuthenticatedApp = async () => {
  const app = import('@/AuthenticatedApp');
  const initialTab = loadInitialTab(window.location.pathname);
  await Promise.all([app, initialTab]);

  return app;
};

const renderLegalPage = (page: ReactNode) => {
  return (
    <main className="flex-1">
      <Suspense fallback={<LegalLoading />}>{page}</Suspense>
    </main>
  );
};

const renderAuthLoading = (pathname: string) => {
  if (pathname === '/') {
    return <LandingLoading />;
  }
  if (isLegalPath(pathname)) {
    return <LegalLoading />;
  }

  return <AppLoadingSkeleton />;
};

const isLegalPath = (pathname: string): boolean => {
  return ['/privacy', '/terms', '/contact'].includes(pathname);
};

const loadInitialTab = (pathname: string): Promise<unknown> => {
  // Installed PWAs start at `/`; the authenticated router immediately sends
  // that route to Today, so it is the initial tab too.
  if (pathname === '/' || pathname === '/today' || pathname === '/expenses') {
    return import('@/pages/today/TodayView');
  }
  if (pathname === '/activity' || pathname === '/income') {
    return import('@/pages/activity/ActivityView');
  }
  if (pathname === '/plan') {
    return import('@/pages/plan/PlanView');
  }
  if (pathname === '/trends' || pathname === '/analytics') {
    return import('@/pages/analytics/AnalyticsView');
  }
  if (pathname === '/trends/explore') {
    return import('@/pages/analytics/TrendsDeepDiveView');
  }

  return Promise.resolve();
};
