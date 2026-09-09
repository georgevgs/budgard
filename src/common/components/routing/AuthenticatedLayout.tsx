import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MilestoneWatcher } from '@/common/components/common/MilestoneWatcher';
import { PullToRefreshIndicator } from '@/common/components/common/PullToRefreshIndicator';
import { NavTabs } from '@/common/components/layout/NavTabs';
import { TopScrim } from '@/common/components/layout/TopScrim';
import { OnboardingGate } from '@/pages/onboarding/components/OnboardingGate';
import { MainTabsLayout } from '@/common/components/routing/MainTabsLayout';
import { UpgradeDialog } from '@/common/components/pro/UpgradeDialog';
import {
  LockScreen,
  prefetchMainTabModules,
} from '@/common/components/routing/lazyRouteModules';
import { QuickAddProvider } from '@/common/contexts/QuickAddProvider';
import { prefetchFormModules } from '@/common/components/layout/lazyFormModules';
import { useAppLock } from '@/common/hooks/useAppLock';
import { useOfflineSync } from '@/common/hooks/useOfflineSync';
import { usePageRefresh } from '@/common/hooks/usePageRefresh';
import { useCheckoutReturn } from '@/common/hooks/useCheckoutReturn';
import { useRouteScrollRestoration } from '@/common/hooks/useRouteScrollRestoration';
import { authApi } from '@/common/api/authApi';
import { isMainTabPath } from '@/constants/routes';
import { SkipToContentLink } from '@/common/components/routing/SkipToContentLink';

export const AuthenticatedLayout = () => {
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
          <MainTabsLayout />
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
      <LockScreen onUnlock={lock.unlock} onSignOut={() => void authApi.signOut()} />
    </Suspense>
  );
};

const useIdleTabPrefetch = () => {
  useEffect(() => {
    // The other tabs and the full transaction forms: everything a user
    // reaches within seconds of landing, fetched once the first screen has
    // had the network to itself.
    const prefetch = () => {
      prefetchMainTabModules();
      prefetchFormModules();
    };
    const requestIdleCallback = window.requestIdleCallback;
    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(prefetch, {
        timeout: 4000,
      });

      return () => window.cancelIdleCallback?.(handle);
    }

    const timer = window.setTimeout(prefetch, 2000);

    return () => window.clearTimeout(timer);
  }, []);
};
