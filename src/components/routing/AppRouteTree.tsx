import { Suspense, useMemo, type ReactNode } from 'react';
import { useRoutes, type RouteObject } from 'react-router-dom';
import TrendsDeepDiveLoadingState from '@/components/analytics/TrendsDeepDiveLoading';
import DebtsLoadingState from '@/components/debts/DebtsLoading';
import { ExpenseLoadingState } from '@/components/expenses/ExpensesLoading';
import GoalsLoadingState from '@/components/goals/GoalsLoading';
import NetWorthLoadingState from '@/components/networth/NetWorthLoading';
import ProRoute from '@/components/pro/ProRoute';
import RecurringLoadingState from '@/components/recurring/RecurringLoading';
import MainTabsLayout from '@/components/routing/MainTabsLayout';
import RouteFallback from '@/components/routing/RouteFallback';
import {
  CatchAllRedirect,
  LegacyRedirect,
  PrivateRoute,
  PublicLayout,
  PublicRoute,
} from '@/components/routing/RouteGuards';
import {
  ContactPage,
  DebtsView,
  GoalsList,
  JoinHouseholdView,
  NetWorthView,
  PrivacyPage,
  RecurringExpensesList,
  ReviewQueueView,
  SettingsView,
  TermsPage,
  TransactionDetailView,
  TrendsDeepDiveView,
} from '@/components/routing/lazyRouteModules';
import SettingsLoadingState from '@/components/settings/SettingsLoading';

const AppRouteTree = () => {
  const routes = useMemo(() => buildRoutes(), []);

  return useRoutes(routes);
};

export default AppRouteTree;

// --- Helpers ---

const withFallback = (element: ReactNode, fallback: ReactNode) => (
  <Suspense fallback={<RouteFallback>{fallback}</RouteFallback>}>
    {element}
  </Suspense>
);

const buildRoutes = (): RouteObject[] => [
  { path: '/', element: <PublicRoute /> },
  {
    path: '/privacy',
    element: (
      <PublicLayout>
        <PrivacyPage />
      </PublicLayout>
    ),
  },
  {
    path: '/terms',
    element: (
      <PublicLayout>
        <TermsPage />
      </PublicLayout>
    ),
  },
  {
    path: '/contact',
    element: (
      <PublicLayout>
        <ContactPage />
      </PublicLayout>
    ),
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <MainTabsLayout />,
        children: [
          { path: '/today' },
          { path: '/activity' },
          { path: '/plan' },
          { path: '/trends' },
        ],
      },
      { path: '/expenses', element: <LegacyRedirect to="/today" /> },
      { path: '/income', element: <LegacyRedirect to="/activity" /> },
      { path: '/analytics', element: <LegacyRedirect to="/trends" /> },
      {
        path: '/trends/explore',
        element: withFallback(
          <TrendsDeepDiveView />,
          <TrendsDeepDiveLoadingState />,
        ),
      },
      {
        path: '/t/:id',
        element: withFallback(
          <TransactionDetailView />,
          <ExpenseLoadingState />,
        ),
      },
      {
        path: '/recurring',
        element: withFallback(
          <RecurringExpensesList />,
          <RecurringLoadingState />,
        ),
      },
      {
        path: '/goals',
        element: (
          <ProRoute
            screenTitleKey="navigation.goals"
            titleKey="pro.gate.goalsTitle"
            descriptionKey="pro.gate.goalsBody"
          >
            {withFallback(<GoalsList />, <GoalsLoadingState />)}
          </ProRoute>
        ),
      },
      {
        path: '/networth',
        element: withFallback(<NetWorthView />, <NetWorthLoadingState />),
      },
      {
        path: '/debts',
        element: withFallback(<DebtsView />, <DebtsLoadingState />),
      },
      {
        path: '/settings/:section?',
        element: withFallback(<SettingsView />, <SettingsLoadingState />),
      },
      {
        path: '/join',
        element: withFallback(<JoinHouseholdView />, <SettingsLoadingState />),
      },
      {
        path: '/review',
        element: withFallback(<ReviewQueueView />, <ExpenseLoadingState />),
      },
    ],
  },
  { path: '*', element: <CatchAllRedirect /> },
];
