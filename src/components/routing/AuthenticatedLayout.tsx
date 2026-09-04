import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MilestoneWatcher from '@/components/common/MilestoneWatcher';
import PullToRefreshIndicator from '@/components/common/PullToRefreshIndicator';
import NavTabs from '@/components/layout/NavTabs';
import TopScrim from '@/components/layout/TopScrim';
import OnboardingGate from '@/components/onboarding/OnboardingGate';
import UpgradeDialog from '@/components/pro/UpgradeDialog';
import {
  LockScreen,
  prefetchMainTabModules,
} from '@/components/routing/lazyRouteModules';
import QuickAddProvider from '@/contexts/QuickAddProvider';
import { useAppLock } from '@/hooks/useAppLock';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import { useCheckoutReturn } from '@/hooks/pro/useCheckoutReturn';
import { useRouteScrollRestoration } from '@/hooks/useRouteScrollRestoration';
import { signOut } from '@/lib/auth';
import { isMainTabPath } from '@/lib/routes';
import SkipToContentLink from '@/components/routing/SkipToContentLink';

const AuthenticatedLayout = () => {
  const { pathname } = useLocation();
  const lock = useAppLock(true);
  useOfflineSync();
  useIdleTabPrefetch();
  useCheckoutReturn();
  useRouteScrollRestoration();
  const refresh = usePageRefresh(isMainTabPath(pathname));

  return (
    <QuickAddProvider>
      <div className="contents" inert={lock.isLocked}>
        <SkipToContentLink />
        <PullToRefreshIndicator state={refresh} />
        <TopScrim />
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
      {renderPrivacyScreen(lock.isObscured)}
      {renderLockScreen(lock)}
    </QuickAddProvider>
  );
};

export default AuthenticatedLayout;

// --- Helpers ---

const renderPrivacyScreen = (isObscured: boolean) => {
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

const useIdleTabPrefetch = () => {
  useEffect(() => {
    const requestIdleCallback = window.requestIdleCallback;
    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(prefetchMainTabModules, {
        timeout: 4000,
      });

      return () => window.cancelIdleCallback?.(handle);
    }

    const timer = window.setTimeout(prefetchMainTabModules, 2000);

    return () => window.clearTimeout(timer);
  }, []);
};
