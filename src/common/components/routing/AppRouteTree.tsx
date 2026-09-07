import { Suspense, useMemo, type ReactNode } from 'react';
import { useRoutes, type RouteObject } from 'react-router-dom';
import { TrendsDeepDiveLoading } from '@/pages/analytics/components/TrendsDeepDiveLoading';
import { DebtsLoading } from '@/pages/debts/components/DebtsLoading';
import { TransactionsLoading } from '@/common/components/common/TransactionsLoading';
import { GoalsLoading } from '@/pages/goals/components/GoalsLoading';
import { NetWorthLoading } from '@/pages/networth/components/NetWorthLoading';
import { ProRoute } from '@/common/components/pro/ProRoute';
import { RecurringLoading } from '@/pages/recurring/components/RecurringLoading';
import { RouteFallback } from '@/common/components/routing/RouteFallback';
import {
  CatchAllRedirect,
  LegacyRedirect,
  PrivateRoute,
  PublicLayout,
  PublicRoute,
} from '@/common/components/routing/RouteGuards';
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
} from '@/common/components/routing/lazyRouteModules';
import { SettingsLoading } from '@/pages/settings/components/SettingsLoading';

export const AppRouteTree = () => {
  const routes = useMemo(() => buildRoutes(), []);

  return useRoutes(routes);
};

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
      { path: '/today' },
      { path: '/activity' },
      { path: '/plan' },
      { path: '/trends' },
      { path: '/expenses', element: <LegacyRedirect to="/today" /> },
      { path: '/income', element: <LegacyRedirect to="/activity" /> },
      { path: '/analytics', element: <LegacyRedirect to="/trends" /> },
      {
        path: '/trends/explore',
        element: withFallback(
          <TrendsDeepDiveView />,
          <TrendsDeepDiveLoading />,
        ),
      },
      {
        path: '/t/:id',
        element: withFallback(
          <TransactionDetailView />,
          <TransactionsLoading />,
        ),
      },
      {
        path: '/recurring',
        element: withFallback(
          <RecurringExpensesList />,
          <RecurringLoading />,
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
            {withFallback(<GoalsList />, <GoalsLoading />)}
          </ProRoute>
        ),
      },
      {
        path: '/networth',
        element: withFallback(<NetWorthView />, <NetWorthLoading />),
      },
      {
        path: '/debts',
        element: withFallback(<DebtsView />, <DebtsLoading />),
      },
      {
        path: '/settings/:section?',
        element: withFallback(<SettingsView />, <SettingsLoading />),
      },
      {
        path: '/join',
        element: withFallback(<JoinHouseholdView />, <SettingsLoading />),
      },
      {
        path: '/review',
        element: withFallback(<ReviewQueueView />, <TransactionsLoading />),
      },
    ],
  },
  { path: '*', element: <CatchAllRedirect /> },
];
