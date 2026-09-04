import { Suspense, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import AnalyticsLoadingState from '@/components/analytics/AnalyticsLoading';
import { ExpenseLoadingState } from '@/components/expenses/ExpensesLoading';
import RecurringLoadingState from '@/components/recurring/RecurringLoading';
import RouteFallback from '@/components/routing/RouteFallback';
import {
  ActivityView,
  AnalyticsView,
  PlanView,
  TodayView,
} from '@/components/routing/lazyRouteModules';
import { isMainTabPath, type MainTabPath } from '@/lib/routes';

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
