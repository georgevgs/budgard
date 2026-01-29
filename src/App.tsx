import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/contexts/AuthContext';
import { usePwaUpdate } from '@/hooks/usePwaUpdate';
import { ErrorBoundary } from '@/components/ui/error-boundary';

// Lazy load heavy components
const Header = lazy(() => import('@/components/layout/Header'));
const NavTabs = lazy(() => import('@/components/layout/NavTabs'));
const ExpensesList = lazy(() => import('@/components/expenses/ExpensesList'));
const AnalyticsView = lazy(() => import('@/components/analytics/AnalyticsView'));
const RecurringExpensesList = lazy(
  () => import('@/components/recurring/RecurringExpensesList'),
);
const LandingPage = lazy(() => import('@/pages/LandingPage'));

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
    <NavTabs />
    <main className="flex-1">
      <Outlet />
    </main>
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
    return <LoadingSpinner />;
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
                <Route path="/expenses" element={<ExpensesList />} />
                <Route path="/recurring" element={<RecurringExpensesList />} />
                <Route path="/analytics" element={<AnalyticsView />} />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
        <Toaster />
      </div>
    </BrowserRouter>
  );
};

export default App;
