import { Suspense, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthenticatedLayout } from '@/common/components/routing/AuthenticatedLayout';
import { RouteFallback } from '@/common/components/routing/RouteFallback';
import { LandingPage } from '@/common/components/routing/lazyRouteModules';
import { AppLoadingSkeleton } from '@/common/components/common/AppLoadingSkeleton';
import { LandingLoading } from '@/pages/landing/components/LandingLoading';
import { LegalLoading } from '@/pages/legal/LegalLoading';
import { useAuth } from '@/common/contexts/AuthContext';

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
    return <LandingLoading />;
  }

  if (session) {
    return <Navigate to="/today" replace />;
  }

  return (
    <PublicLayout>
      <Suspense
        fallback={
          <RouteFallback>
            <LandingLoading />
          </RouteFallback>
        }
      >
        <LandingPage />
      </Suspense>
    </PublicLayout>
  );
};

export const PublicLayout = ({ children }: { children: ReactNode }) => {
  return (
    <main className="flex-1">
      <Suspense
        fallback={
          <RouteFallback>
            <LegalLoading />
          </RouteFallback>
        }
      >
        {children}
      </Suspense>
    </main>
  );
};

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
