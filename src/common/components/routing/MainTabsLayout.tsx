import { Suspense, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import AnalyticsLoadingState from '@/pages/analytics/components/AnalyticsLoading';
import { ExpenseLoadingState } from '@/pages/expenses/components/ExpensesLoading';
import RecurringLoadingState from '@/pages/recurring/components/RecurringLoading';
import RouteFallback from '@/common/components/routing/RouteFallback';
import {
  ActivityView,
  AnalyticsView,
  PlanView,
  TodayView,
} from '@/common/components/routing/lazyRouteModules';
import { isMainTabPath, type MainTabPath } from '@/constants/routes';

const MainTabsLayout = () => {
  const { pathname } = useLocation();
  const [visited, setVisited] = useState<ReadonlySet<MainTabPath>>(
    () => new Set(),
  );
  if (isMainTabPath(pathname) && !visited.has(pathname)) {
    setVisited((previous) => new Set(previous).add(pathname));
  }

  return (
    <>
      {renderTab(
        '/today',
        pathname,
        visited,
        <ExpenseLoadingState />,
        <TodayView />,
      )}
      {renderTab(
        '/activity',
        pathname,
        visited,
        <ExpenseLoadingState />,
        <ActivityView />,
      )}
      {renderTab(
        '/plan',
        pathname,
        visited,
        <RecurringLoadingState />,
        <PlanView />,
      )}
      {renderTab(
        '/trends',
        pathname,
        visited,
        <AnalyticsLoadingState />,
        <AnalyticsView />,
      )}
    </>
  );
};

export default MainTabsLayout;

// --- Helpers ---

const renderTab = (
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
      <Suspense fallback={<RouteFallback>{fallback}</RouteFallback>}>
        {element}
      </Suspense>
    </div>
  );
};
