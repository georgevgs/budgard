import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/contexts/AuthContext';
import { usePwaUpdate } from '@/hooks/usePwaUpdate';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import Header from '@/components/layout/Header';
import NavTabs from '@/components/layout/NavTabs';
import { AppLoadingSkeleton, ExpenseLoadingState } from '@/components/expenses/ExpensesLoading';
import RecurringLoadingState from '@/components/recurring/RecurringLoading';
import AnalyticsLoadingState from '@/components/analytics/AnalyticsLoading';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

// Lazy load route-level components with retry on chunk failure
const ExpensesList = lazyWithRetry(
  () => import('@/components/expenses/ExpensesList'),
);
const AnalyticsView = lazyWithRetry(
  () => import('@/components/analytics/AnalyticsView'),
);
const RecurringExpensesList = lazyWithRetry(
  () => import('@/components/recurring/RecurringExpensesList'),
);
const LandingPage = lazyWithRetry(() => import('@/pages/LandingPage'));

// ============================================================================
// Loading Component
// ============================================================================

const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// ============================================================================
// Layout Components
// ============================================================================

const AuthenticatedLayout = () => (
  <>
    <Header />
    <main className="flex-1 pt-2 pb-20">
      <Outlet />
    </main>
    <NavTabs />
  </>
);

const PublicLayout = ({ children }: { children: ReactNode }) => (
  <main className="flex-1">{children}</main>
);

// ============================================================================
// Route Guards
// ============================================================================

const PrivateRoute = () => {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <AppLoadingSkeleton />;
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  return <AuthenticatedLayout />;
};

const PublicRoute = () => {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (session) {
    return <Navigate to="/expenses" replace />;
  }

  return (
    <PublicLayout>
      <LandingPage />
    </PublicLayout>
  );
};

// ============================================================================
// Offline Banner
// ============================================================================

const OfflineBanner = () => {
  const isOnline = useOnlineStatus();
  // Track whether we've ever gone offline so we can show a "back online" flash
  const wentOffline = useRef(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      wentOffline.current = true;
    }
  }, [isOnline]);

  useEffect(() => {
    if (isOnline && wentOffline.current) {
      setShowBackOnline(true);
      const t = setTimeout(() => setShowBackOnline(false), 2500);
      return () => clearTimeout(t);
    }
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="fixed bottom-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="flex items-center gap-2 rounded-full bg-destructive text-destructive-foreground text-sm font-medium px-4 py-2 shadow-lg pointer-events-auto">
          <span className="h-2 w-2 rounded-full bg-destructive-foreground/70 animate-pulse" />
          No internet connection
        </div>
      </div>
    );
  }

  if (showBackOnline) {
    return (
      <div className="fixed bottom-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="flex items-center gap-2 rounded-full bg-green-600 text-white text-sm font-medium px-4 py-2 shadow-lg pointer-events-auto">
          <span className="h-2 w-2 rounded-full bg-white/70" />
          Back online
        </div>
      </div>
    );
  }

  return null;
};

// ============================================================================
// App Component
// ============================================================================

const App = () => {
  usePwaUpdate();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background flex flex-col">
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public route */}
              <Route path="/" element={<PublicRoute />} />

              {/* Authenticated routes with shared layout */}
              <Route element={<PrivateRoute />}>
                <Route
                  path="/expenses"
                  element={
                    <Suspense fallback={<ExpenseLoadingState />}>
                      <ExpensesList />
                    </Suspense>
                  }
                />
                <Route
                  path="/recurring"
                  element={
                    <Suspense fallback={<RecurringLoadingState />}>
                      <RecurringExpensesList />
                    </Suspense>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <Suspense fallback={<AnalyticsLoadingState />}>
                      <AnalyticsView />
                    </Suspense>
                  }
                />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
        <OfflineBanner />
        <Toaster />
      </div>
    </BrowserRouter>
  );
};

export default App;
