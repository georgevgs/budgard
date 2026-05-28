import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDataConfig,
  useExpensesData,
  useCategoriesData,
} from '@/contexts/DataContext';
import { usePwaUpdate } from '@/hooks/usePwaUpdate';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import Header from '@/components/layout/Header';
import NavTabs from '@/components/layout/NavTabs';
import { shouldShowOnboarding } from '@/lib/onboarding';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import {
  AppLoadingSkeleton,
  ExpenseLoadingState,
} from '@/components/expenses/ExpensesLoading';
import RecurringLoadingState from '@/components/recurring/RecurringLoading';
import AnalyticsLoadingState from '@/components/analytics/AnalyticsLoading';
import GoalsLoadingState from '@/components/goals/GoalsLoading';
import NetWorthLoadingState from '@/components/networth/NetWorthLoading';
import DebtsLoadingState from '@/components/debts/DebtsLoading';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

// Lazy load route-level components with retry on chunk failure
const ExpensesList = lazyWithRetry(
  () => import('@/components/expenses/ExpensesList'),
);
const IncomeList = lazyWithRetry(
  () => import('@/components/income/IncomeList'),
);
const AnalyticsView = lazyWithRetry(
  () => import('@/components/analytics/AnalyticsView'),
);
const RecurringExpensesList = lazyWithRetry(
  () => import('@/components/recurring/RecurringExpensesList'),
);
const GoalsList = lazyWithRetry(
  () => import('@/components/goals/GoalsList'),
);
const NetWorthView = lazyWithRetry(
  () => import('@/components/networth/NetWorthView'),
);
const DebtsView = lazyWithRetry(
  () => import('@/components/debts/DebtsView'),
);
const SettingsView = lazyWithRetry(
  () => import('@/components/settings/SettingsView'),
);
const LandingPage = lazyWithRetry(() => import('@/pages/LandingPage'));
const OnboardingFlow = lazyWithRetry(
  () => import('@/components/onboarding/OnboardingFlow'),
);

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

const AuthenticatedLayout = () => {
  useOfflineSync();
  useIdleTabPrefetch();
  const expenses = useExpensesData();
  const { categories } = useCategoriesData();
  const { isInitialized, monthlyBudget } = useDataConfig();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (
      shouldShowOnboarding(
        isInitialized,
        expenses.length,
        categories.length,
        monthlyBudget,
      )
    ) {
      setShowOnboarding(true);
    }
  }, [isInitialized, expenses.length, categories.length, monthlyBudget]);

  return (
    <>
      <Header />
      <main className="flex-1 pt-2 pb-20">
        <Outlet />
      </main>
      <NavTabs />
      {renderOnboarding(showOnboarding, () => setShowOnboarding(false))}
    </>
  );
};

const renderOnboarding = (isOpen: boolean, onComplete: () => void) => {
  if (!isOpen) return null;

  return (
    <Suspense fallback={null}>
      <OnboardingFlow isOpen={isOpen} onComplete={onComplete} />
    </Suspense>
  );
};

// Once the user is authenticated and the initial tab has painted, fetch the
// other bottom-nav tab chunks during idle time. By the time the user taps a
// sibling tab the JS is already in the browser cache, so the Suspense
// fallback inside MainTabsLayout never has to flash.
const useIdleTabPrefetch = () => {
  useEffect(() => {
    const prefetch = () => {
      // Same module specifiers as the lazyWithRetry imports above, so Rollup
      // reuses the same chunks rather than emitting new ones.
      import('@/components/expenses/ExpensesList');
      import('@/components/income/IncomeList');
      import('@/components/recurring/RecurringExpensesList');
      import('@/components/analytics/AnalyticsView');
    };

    const ric = (window as Window).requestIdleCallback;
    if (typeof ric === 'function') {
      const handle = ric(prefetch, { timeout: 4000 });

      return () => (window as Window).cancelIdleCallback?.(handle);
    }

    const timer = setTimeout(prefetch, 2000);

    return () => clearTimeout(timer);
  }, []);
};

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

const CatchAllRedirect = () => {
  const { session } = useAuth();
  let target = '/';
  if (session) {
    target = '/expenses';
  }

  return <Navigate to={target} replace />;
};

// ============================================================================
// Main Tabs Keep-Alive Layout
// ============================================================================
// The four bottom-nav tabs share this layout so switching between them does
// not unmount/remount the route. Each tab mounts on its first visit and is
// hidden (display: none) when inactive. This preserves local UI state
// (selected month, filters, expanded dashboard) and avoids re-running the
// derived-state useMemos in heavy views (Analytics aggregates, expense
// filtering pipeline) on every tab switch.

const MAIN_TAB_PATHS = [
  '/expenses',
  '/income',
  '/recurring',
  '/analytics',
] as const;
type MainTabPath = (typeof MAIN_TAB_PATHS)[number];

const isMainTabPath = (path: string): path is MainTabPath =>
  (MAIN_TAB_PATHS as readonly string[]).includes(path);

const MainTabsLayout = () => {
  const { pathname } = useLocation();
  // Track which tabs have been visited via a ref so we can update during
  // render — useState + useEffect would leave a one-frame gap where the
  // target tab isn't in the set yet.
  const visitedRef = useRef<Set<MainTabPath>>(new Set());
  if (isMainTabPath(pathname)) {
    visitedRef.current.add(pathname);
  }
  const visited = visitedRef.current;

  return (
    <>
      {renderKeepAliveTab(
        '/expenses',
        pathname,
        visited,
        <ExpenseLoadingState />,
        <ExpensesList />,
      )}
      {renderKeepAliveTab(
        '/income',
        pathname,
        visited,
        <ExpenseLoadingState />,
        <IncomeList />,
      )}
      {renderKeepAliveTab(
        '/recurring',
        pathname,
        visited,
        <RecurringLoadingState />,
        <RecurringExpensesList />,
      )}
      {renderKeepAliveTab(
        '/analytics',
        pathname,
        visited,
        <AnalyticsLoadingState />,
        <AnalyticsView />,
      )}
    </>
  );
};

const renderKeepAliveTab = (
  tabPath: MainTabPath,
  activePath: string,
  visited: Set<MainTabPath>,
  fallback: ReactNode,
  element: ReactNode,
) => {
  if (!visited.has(tabPath)) return null;

  const isActive = activePath === tabPath;

  return (
    <div key={tabPath} hidden={!isActive}>
      <Suspense fallback={fallback}>{element}</Suspense>
    </div>
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
                {/* Bottom-nav tabs share a keep-alive layout to preserve
                    state and avoid re-running heavy memos on every switch.
                    MainTabsLayout renders all four tabs directly (no Outlet),
                    so each leaf route gets an empty element — its only job is
                    to participate in path matching. */}
                <Route element={<MainTabsLayout />}>
                  <Route path="/expenses" element={null} />
                  <Route path="/income" element={null} />
                  <Route path="/recurring" element={null} />
                  <Route path="/analytics" element={null} />
                </Route>
                <Route
                  path="/goals"
                  element={
                    <Suspense fallback={<GoalsLoadingState />}>
                      <GoalsList />
                    </Suspense>
                  }
                />
                <Route
                  path="/networth"
                  element={
                    <Suspense fallback={<NetWorthLoadingState />}>
                      <NetWorthView />
                    </Suspense>
                  }
                />
                <Route
                  path="/debts"
                  element={
                    <Suspense fallback={<DebtsLoadingState />}>
                      <DebtsView />
                    </Suspense>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <SettingsView />
                    </Suspense>
                  }
                />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<CatchAllRedirect />} />
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
