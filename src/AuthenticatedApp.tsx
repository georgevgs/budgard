import { Suspense, useEffect, useState, type ReactNode } from 'react';
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
import { ErrorBoundary } from '@/components/ui/error-boundary';
import TopScrim from '@/components/layout/TopScrim';
import NavTabs from '@/components/layout/NavTabs';
import MilestoneWatcher from '@/components/common/MilestoneWatcher';
import ProRoute from '@/components/pro/ProRoute';
import UpgradeDialog from '@/components/pro/UpgradeDialog';
import { useCheckoutReturn } from '@/hooks/pro/useCheckoutReturn';
import { useUpgradeIntent } from '@/hooks/pro/useUpgradeIntent';
import { shouldShowOnboarding } from '@/lib/onboarding';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useRouteScrollRestoration } from '@/hooks/useRouteScrollRestoration';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import PullToRefreshIndicator from '@/components/common/PullToRefreshIndicator';
import { useAppLock } from '@/hooks/useAppLock';
import { signOut } from '@/lib/auth';
import {
  AppLoadingSkeleton,
  ExpenseLoadingState,
} from '@/components/expenses/ExpensesLoading';
import RecurringLoadingState from '@/components/recurring/RecurringLoading';
import AnalyticsLoadingState from '@/components/analytics/AnalyticsLoading';
import TrendsDeepDiveLoadingState from '@/components/analytics/TrendsDeepDiveLoading';
import GoalsLoadingState from '@/components/goals/GoalsLoading';
import NetWorthLoadingState from '@/components/networth/NetWorthLoading';
import DebtsLoadingState from '@/components/debts/DebtsLoading';
import SettingsLoadingState from '@/components/settings/SettingsLoading';
import LandingLoadingState from '@/components/landing/LandingLoading';
import LegalLoadingState from '@/pages/legal/LegalLoading';
import DelayedFallback from '@/components/ui/delayed-fallback';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import AuthenticatedProviders from '@/contexts/AuthenticatedProviders';
import QuickAddProvider from '@/contexts/QuickAddProvider';
import { isMainTabPath, type MainTabPath } from '@/lib/routes';
import RouteMetadata from '@/components/common/RouteMetadata';
import OfflineBanner from '@/components/common/OfflineBanner';

// Lazy load route-level components with retry on chunk failure
const TodayView = lazyWithRetry(() => import('@/components/today/TodayView'));
const ActivityView = lazyWithRetry(
  () => import('@/components/activity/ActivityView'),
);
const PlanView = lazyWithRetry(() => import('@/components/plan/PlanView'));
const AnalyticsView = lazyWithRetry(
  () => import('@/components/analytics/AnalyticsView'),
);
const TrendsDeepDiveView = lazyWithRetry(
  () => import('@/components/analytics/TrendsDeepDiveView'),
);
const RecurringExpensesList = lazyWithRetry(
  () => import('@/components/recurring/RecurringExpensesList'),
);
const GoalsList = lazyWithRetry(() => import('@/components/goals/GoalsList'));
const NetWorthView = lazyWithRetry(
  () => import('@/components/networth/NetWorthView'),
);
const DebtsView = lazyWithRetry(() => import('@/components/debts/DebtsView'));
// Not lazy: the lock has to be able to paint on the very first frame, and a
// chunk fetch would leave the app readable while it loaded — which is the one
// moment the lock exists to cover.
const LockScreen = lazyWithRetry(
  () => import('@/components/security/LockScreen'),
);
const TransactionDetailView = lazyWithRetry(
  () => import('@/components/transaction/TransactionDetailView'),
);
const SettingsView = lazyWithRetry(
  () => import('@/components/settings/SettingsView'),
);
const JoinHouseholdView = lazyWithRetry(
  () => import('@/components/household/JoinHouseholdView'),
);
const ReviewQueueView = lazyWithRetry(
  () => import('@/components/review/ReviewQueueView'),
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
  const { pathname } = useLocation();
  const lock = useAppLock(true);
  useOfflineSync();
  useIdleTabPrefetch();
  useCheckoutReturn();
  useRouteScrollRestoration();
  // One pull gesture for the whole shell. It cannot live inside the tab views:
  // MainTabsLayout keeps every visited tab mounted and merely hides it, so a
  // per-view hook would leave several document listeners attached at once and
  // a single pull would fire a refetch for each of them.
  const refresh = usePageRefresh(isMainTabPath(pathname));

  return (
    <QuickAddProvider>
      {/* inert while locked, not merely covered. A fixed overlay hides the app
          from the eye but leaves it in the accessibility tree and in the tab
          order — a keyboard user could Tab straight past the lock screen into
          the account it is supposed to be guarding. */}
      <div className="contents" inert={lock.isLocked}>
        <SkipToContentLink />
        <PullToRefreshIndicator state={refresh} />
        <TopScrim />
        {/* pull-shell: the page travels with the pull so the indicator emerges
            into space rather than landing on top of the content. The travel
            itself is CSS (index.css), driven by a custom property the gesture
            writes straight to the document element — a drag has to move the
            page without re-rendering everything inside it once a frame. */}
        <main
          id="main-content"
          tabIndex={-1}
          className="pull-shell route-transition-content flex-1 pb-(--dock-inset) focus:outline-none"
        >
          <Outlet />
        </main>
        <NavTabs />
        <MilestoneWatcher />
        <UpgradeDialog />
        <OnboardingGate />
      </div>
      <PrivacyScreen isObscured={lock.isObscured} />
      {renderLockScreen(lock)}
    </QuickAddProvider>
  );
};

// The OS photographs the app for its multitasking switcher the moment it is
// backgrounded, and that screenshot is visible to anyone who double-taps home
// — before any lock screen would have had a chance to appear. This covers the
// app for the frame in which that photograph is taken.
const PrivacyScreen = ({ isObscured }: { isObscured: boolean }) => {
  if (!isObscured) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-150 bg-background"
    />
  );
};

const renderLockScreen = (lock: ReturnType<typeof useAppLock>) => {
  if (!lock.isLocked) {
    return null;
  }

  return (
    <Suspense fallback={<div className="fixed inset-0 z-200 bg-background" />}>
      <LockScreen onUnlock={lock.unlock} onSignOut={() => void signOut()} />
    </Suspense>
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

// Subscribes to the data slices that decide whether onboarding is due. Kept
// out of AuthenticatedLayout so expense/category mutations re-render only
// this leaf instead of the whole authenticated shell.
const OnboardingGate = () => {
  const expenses = useExpensesData();
  const { categories } = useCategoriesData();
  const { isInitialized, monthlyBudget } = useDataConfig();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  const onboardingDue = shouldShowOnboarding(
    isInitialized,
    expenses.length,
    categories.length,
    monthlyBudget,
  );
  // Latch during render (guarded): once due, the flow stays open even if data
  // created mid-flow makes the condition false again. Completing the flow
  // writes the onboarded flag before closing, so this never re-latches after.
  if (onboardingDue && !showOnboarding && !dismissedThisSession) {
    setShowOnboarding(true);
  }

  // A landing-page "Get Pro" choice completes here after sign-in. Blocked
  // until the data layer knows whether onboarding is due — and while it runs —
  // so the upgrade dialog never opens underneath the onboarding flow.
  useUpgradeIntent(
    !isInitialized ||
      showOnboarding ||
      (onboardingDue && !dismissedThisSession),
  );

  const handleDismiss = () => {
    setDismissedThisSession(true);
    setShowOnboarding(false);
  };

  return renderOnboarding(
    showOnboarding,
    () => setShowOnboarding(false),
    handleDismiss,
  );
};

const renderOnboarding = (
  isOpen: boolean,
  onComplete: () => void,
  onDismiss: () => void,
) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <OnboardingFlow
        isOpen={isOpen}
        onComplete={onComplete}
        onDismiss={onDismiss}
      />
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
      // The real navigation is still protected by lazyWithRetry → reset.html.
      const swallow = () => {};
      import('@/components/today/TodayView').catch(swallow);
      import('@/components/activity/ActivityView').catch(swallow);
      import('@/components/plan/PlanView').catch(swallow);
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
    return <Navigate to="/today" replace />;
  }

  return (
    <PublicLayout>
      <Suspense fallback={renderRouteFallback(<LandingLoadingState />)}>
        <LandingPage />
      </Suspense>
    </PublicLayout>
  );
};

// Forwards a renamed tab path to its replacement, carrying the query string
// with it. `replace` so the dead path never lands in history — a back tap from
// /today would otherwise bounce straight through /expenses and back again.
const LegacyRedirect = ({ to }: { to: string }) => {
  const { search } = useLocation();

  return <Navigate to={`${to}${search}`} replace />;
};

const CatchAllRedirect = () => {
  const { session } = useAuth();
  let target = '/';
  if (session) {
    target = '/today';
  }

  return <Navigate to={target} replace />;
};

// ============================================================================
// Main Tabs Keep-Alive Layout
// ============================================================================
// The four bottom-nav tabs share this layout so switching between them does
// not unmount/remount the route. Each tab mounts on its first visit and is
// hidden (display: none) when inactive. This preserves local UI state
// (selected month and filters) and avoids re-running the derived-state
// calculations in Activity and Trends on every tab switch.

const MainTabsLayout = () => {
  const { pathname } = useLocation();
  // Track which tabs have been visited. Recorded during render (guarded
  // setState) — useState + useEffect would leave a one-frame gap where the
  // target tab isn't in the set yet.
  const [visited, setVisited] = useState<ReadonlySet<MainTabPath>>(
    () => new Set(),
  );
  if (isMainTabPath(pathname) && !visited.has(pathname)) {
    setVisited((prev) => new Set(prev).add(pathname));
  }

  return (
    <>
      {renderKeepAliveTab(
        '/today',
        pathname,
        visited,
        <ExpenseLoadingState />,
        <TodayView />,
      )}
      {renderKeepAliveTab(
        '/activity',
        pathname,
        visited,
        <ExpenseLoadingState />,
        <ActivityView />,
      )}
      {renderKeepAliveTab(
        '/plan',
        pathname,
        visited,
        <RecurringLoadingState />,
        <PlanView />,
      )}
      {renderKeepAliveTab(
        '/trends',
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
  visited: ReadonlySet<MainTabPath>,
  fallback: ReactNode,
  element: ReactNode,
) => {
  if (!visited.has(tabPath)) {
    return null;
  }

  const isActive = activePath === tabPath;

  return (
    <div key={tabPath} hidden={!isActive}>
      <Suspense fallback={renderRouteFallback(fallback)}>{element}</Suspense>
    </div>
  );
};

// ============================================================================
// App Component
// ============================================================================

const AuthenticatedApp = () => {
  return (
    <BrowserRouter>
      <AuthenticatedProviders>
        <RouteMetadata />
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
                    <Route path="/today" element={null} />
                    <Route path="/activity" element={null} />
                    <Route path="/plan" element={null} />
                    <Route path="/trends" element={null} />
                  </Route>
                  {/* Legacy tab paths. Push notifications and home-screen
                      shortcuts installed before the rename still point here,
                      and the notification edge function ships separately from
                      the app — so these have to keep resolving indefinitely.
                      The search string rides along because the add-expense
                      notification arrives as /expenses?action=add. */}
                  <Route
                    path="/expenses"
                    element={<LegacyRedirect to="/today" />}
                  />
                  <Route
                    path="/income"
                    element={<LegacyRedirect to="/activity" />}
                  />
                  <Route
                    path="/analytics"
                    element={<LegacyRedirect to="/trends" />}
                  />
                  <Route
                    path="/trends/explore"
                    element={
                      <Suspense
                        fallback={renderRouteFallback(
                          <TrendsDeepDiveLoadingState />,
                        )}
                      >
                        <TrendsDeepDiveView />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/t/:id"
                    element={
                      <Suspense
                        fallback={renderRouteFallback(<ExpenseLoadingState />)}
                      >
                        <TransactionDetailView />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/recurring"
                    element={<RecurringExpensesList />}
                  />
                  <Route
                    path="/goals"
                    element={
                      <ProRoute
                        screenTitleKey="navigation.goals"
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
                    path="/settings/:section?"
                    element={
                      <Suspense
                        fallback={renderRouteFallback(<SettingsLoadingState />)}
                      >
                        <SettingsView />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/join"
                    element={
                      <Suspense
                        fallback={renderRouteFallback(<SettingsLoadingState />)}
                      >
                        <JoinHouseholdView />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/review"
                    element={
                      <Suspense
                        fallback={renderRouteFallback(<ExpenseLoadingState />)}
                      >
                        <ReviewQueueView />
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
      </AuthenticatedProviders>
    </BrowserRouter>
  );
};

export default AuthenticatedApp;
