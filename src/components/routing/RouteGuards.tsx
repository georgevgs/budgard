import { Suspense, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AuthenticatedLayout from '@/components/routing/AuthenticatedLayout';
import RouteFallback from '@/components/routing/RouteFallback';
import { LandingPage } from '@/components/routing/lazyRouteModules';
import { AppLoadingSkeleton } from '@/components/expenses/ExpensesLoading';
import LandingLoadingState from '@/components/landing/LandingLoading';
import LegalLoadingState from '@/pages/legal/LegalLoading';
import { useAuth } from '@/contexts/AuthContext';

export const PrivateRoute = () => {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <AppLoadingSkeleton />;
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  return <AuthenticatedLayout />;
};

export const PublicRoute = () => {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <LandingLoadingState />;
  }

  if (session) {
    return <Navigate to="/today" replace />;
  }

  return (
    <PublicLayout>
      <Suspense
        fallback={
          <RouteFallback>
            <LandingLoadingState />
          </RouteFallback>
        }
      >
        <LandingPage />
      </Suspense>
    </PublicLayout>
  );
};

export const PublicLayout = ({ children }: { children: ReactNode }) => (
  <main className="flex-1">
    <Suspense
      fallback={
        <RouteFallback>
          <LegalLoadingState />
        </RouteFallback>
      }
    >
      {children}
    </Suspense>
  </main>
);

export const LegacyRedirect = ({ to }: { to: string }) => {
  const { search } = useLocation();

  return <Navigate to={`${to}${search}`} replace />;
};

export const CatchAllRedirect = () => {
  const { session } = useAuth();
  let target = '/';
  if (session) {
    target = '/today';
  }

  return <Navigate to={target} replace />;
};
