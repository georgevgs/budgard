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
  mainTabPrefetches,
} from '@/common/components/routing/lazyRouteModules';
import { QuickAddProvider } from '@/common/contexts/QuickAddProvider';
import { formPrefetches } from '@/common/components/layout/lazyFormModules';
import { useAppLock } from '@/common/hooks/useAppLock';
import { useOfflineSync } from '@/common/hooks/useOfflineSync';
import { usePageRefresh } from '@/common/hooks/usePageRefresh';
import { useCheckoutReturn } from '@/common/hooks/useCheckoutReturn';
import { useRouteScrollRestoration } from '@/common/hooks/useRouteScrollRestoration';
import { authApi } from '@/common/api/authApi';
import { isMainTabPath } from '@/constants/routes';
import { scheduleBackgroundWork } from '@/constants/backgroundWork';
import { SkipToContentLink } from '@/common/components/routing/SkipToContentLink';

export const AuthenticatedLayout = () => {
  const { pathname } = useLocation();
  const lock = useAppLock(true);
  useOfflineSync();
  useCheckoutReturn();
  useRouteScrollRestoration();
  const refresh = usePageRefresh(isMainTabPath(pathname));

  useEffect(
    () => scheduleBackgroundWork([...mainTabPrefetches, ...formPrefetches]),
    [],
  );

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
      <LockScreen
        onUnlock={lock.unlock}
        onSignOut={() => void authApi.signOut()}
      />
    </Suspense>
  );
};
