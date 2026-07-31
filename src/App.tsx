import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useOfflineQueueCount } from '@/hooks/useOfflineQueueCount';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import Header from '@/components/layout/Header';
import NavTabs from '@/components/layout/NavTabs';
import MilestoneWatcher from '@/components/common/MilestoneWatcher';
import ProRoute from '@/components/pro/ProRoute';
import UpgradeDialog from '@/components/pro/UpgradeDialog';
import { useCheckoutReturn } from '@/hooks/pro/useCheckoutReturn';
import { useUpgradeIntent } from '@/hooks/pro/useUpgradeIntent';
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
import SettingsLoadingState from '@/components/settings/SettingsLoading';
import LandingLoadingState from '@/components/landing/LandingLoading';
import LegalLoadingState from '@/pages/legal/LegalLoading';
import DelayedFallback from '@/components/ui/delayed-fallback';
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
const PrivacyPage = lazyWithRetry(() => import('@/pages/legal/PrivacyPage'));
const TermsPage = lazyWithRetry(() => import('@/pages/legal/TermsPage'));
const ContactPage = lazyWithRetry(() => import('@/pages/legal/ContactPage'));
const OnboardingFlow = lazyWithRetry(
  () => import('@/components/onboarding/OnboardingFlow'),
);

// ============================================================================
// Route Fallbacks
// ============================================================================

// Every route waits behind a skeleton shaped like the screen it is about to
// become — never a centred spinner, which tells the user nothing about where
// they are heading and reads as slower than the same wait spent on a skeleton.
// DelayedFallback holds each one back ~200ms so a route whose chunk is already
// in cache (the common case, thanks to useIdleTabPrefetch) swaps straight to
// content instead of flashing a placeholder for two frames.
const renderRouteFallback = (skeleton: ReactNode) => (
  <DelayedFallback>{skeleton}</DelayedFallback>
);

// ============================================================================
// Layout Components
// ============================================================================

const AuthenticatedLayout = () => {
  useOfflineSync();
  useIdleTabPrefetch();
  useCheckoutReturn();

  return (
    <>
      <SkipToContentLink />
      <ScrollToTop />
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 pt-2 pb-(--dock-inset) focus:outline-none"
      >
        <Outlet />
      </main>
      <div className="nav-scrim" aria-hidden="true" />
      <NavTabs />
      <MilestoneWatcher />
      <UpgradeDialog />
      <OnboardingGate />
    </>
  );
};

// Visually hidden until focused — the first Tab on the authenticated app jumps
// keyboard/screen-reader users straight past the header into the main content.
const SkipToContentLink = () => {
  const { t } = useTranslation();

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
    >
      {t('common.skipToContent')}
    </a>
  );
};

// Reset window scroll when landing on a freshly-mounted secondary route. The
// four keep-alive tabs share window scroll and preserve their own view state,
// so they are intentionally skipped to avoid fighting that layout.
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (isMainTabPath(pathname)) return;

    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Subscribes to the data slices that decide whether onboarding is due. Kept
// out of AuthenticatedLayout so expense/category mutations re-render only
// this leaf instead of the whole authenticated shell.
const OnboardingGate = () => {
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

  // A landing-page "Get Pro" choice completes here after sign-in. Blocked
  // until the data layer knows whether onboarding is due — and while it runs —
  // so the upgrade dialog never opens underneath the onboarding flow.
  useUpgradeIntent(
    !isInitialized ||
      showOnboarding ||
      shouldShowOnboarding(
        isInitialized,
        expenses.length,
        categories.length,
        monthlyBudget,
      ),
  );

  return renderOnboarding(showOnboarding, () => setShowOnboarding(false));
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
      // Prefetch is a background optimization — swallow failures (a transient
      // network blip on mobile throws "Importing a module script failed.").
      // The real navigation is still protected by lazyWithRetry → /reset.
      const swallow = () => {};
      import('@/components/expenses/ExpensesList').catch(swallow);
      import('@/components/income/IncomeList').catch(swallow);
      import('@/components/recurring/RecurringExpensesList').catch(swallow);
      import('@/components/analytics/AnalyticsView').catch(swallow);
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

// The legal pages land here with no closer Suspense boundary, so the prose
// skeleton is their fallback. PublicRoute nests its own boundary inside for
// the landing page, which is a different shape entirely.
const PublicLayout = ({ children }: { children: ReactNode }) => (
  <main className="flex-1">
    <Suspense fallback={renderRouteFallback(<LegalLoadingState />)}>
      {children}
    </Suspense>
  </main>
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
    return <LandingLoadingState />;
  }

  if (session) {
    return <Navigate to="/expenses" replace />;
  }

  return (
    <PublicLayout>
      <Suspense fallback={renderRouteFallback(<LandingLoadingState />)}>
        <LandingPage />
      </Suspense>
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
        <ExpenseLoadingState section="income" />,
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
      <Suspense fallback={renderRouteFallback(fallback)}>{element}</Suspense>
    </div>
  );
};

// ============================================================================
// Offline Banner
// ============================================================================

const OfflineBanner = () => {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const pendingCount = useOfflineQueueCount();
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
      const timer = setTimeout(() => setShowBackOnline(false), 2500);

      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!isOnline) {
    return renderStatusPill(OFFLINE_PILL, t('common.offline'));
  }

  if (pendingCount > 0) {
    return renderStatusPill(
      PENDING_PILL,
      t('offline.pending', { count: pendingCount }),
    );
  }

  if (showBackOnline) {
    return renderStatusPill(ONLINE_PILL, t('common.backOnline'));
  }

  return null;
};

// --- Helpers ---

type StatusPillTone = {
  pill: string;
  dot: string;
};

const OFFLINE_PILL: StatusPillTone = {
  pill: 'bg-destructive text-destructive-foreground',
  dot: 'bg-destructive-foreground/70 animate-pulse',
};

const PENDING_PILL: StatusPillTone = {
  pill: 'bg-secondary text-secondary-foreground',
  dot: 'bg-secondary-foreground/70 animate-pulse',
};

const ONLINE_PILL: StatusPillTone = {
  pill: 'bg-income text-income-foreground',
  dot: 'bg-income-foreground/70',
};

const renderStatusPill = (tone: StatusPillTone, label: string) => (
  <div className="fixed bottom-[calc(var(--dock-clearance)+0.75rem)] left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
    <div
      role="status"
      className={`flex items-center gap-2 rounded-full ${tone.pill} text-sm font-medium px-4 py-2 shadow-lg pointer-events-auto`}
    >
      <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
      {label}
    </div>
  </div>
);

// ============================================================================
// App Component
// ============================================================================

const App = () => {
  usePwaUpdate();

  return (
    <BrowserRouter>
      <div className="min-h-dvh bg-background flex flex-col">
        <ErrorBoundary>
          {/* Last-resort net. Every route below now has a closer boundary with
              a fallback shaped like its own screen, so this only catches a
              lazy import nobody wrapped — the app shell is the safest guess
              when we don't yet know which screen is coming. */}
          <Suspense fallback={renderRouteFallback(<AppLoadingSkeleton />)}>
            <Routes>
              {/* Public route */}
              <Route path="/" element={<PublicRoute />} />

              {/* Legal pages, reachable signed in or out */}
              <Route
                path="/privacy"
                element={
                  <PublicLayout>
                    <PrivacyPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/terms"
                element={
                  <PublicLayout>
                    <TermsPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/contact"
                element={
                  <PublicLayout>
                    <ContactPage />
                  </PublicLayout>
                }
              />

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
                    <ProRoute
                      titleKey="pro.gate.goalsTitle"
                      descriptionKey="pro.gate.goalsBody"
                    >
                      <Suspense
                        fallback={renderRouteFallback(<GoalsLoadingState />)}
                      >
                        <GoalsList />
                      </Suspense>
                    </ProRoute>
                  }
                />
                <Route
                  path="/networth"
                  element={
                    <Suspense
                      fallback={renderRouteFallback(<NetWorthLoadingState />)}
                    >
                      <NetWorthView />
                    </Suspense>
                  }
                />
                <Route
                  path="/debts"
                  element={
                    <Suspense
                      fallback={renderRouteFallback(<DebtsLoadingState />)}
                    >
                      <DebtsView />
                    </Suspense>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <Suspense
                      fallback={renderRouteFallback(<SettingsLoadingState />)}
                    >
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
