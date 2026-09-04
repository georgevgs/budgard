import { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import OfflineBanner from '@/components/common/OfflineBanner';
import RouteMetadata from '@/components/common/RouteMetadata';
import { AppLoadingSkeleton } from '@/components/expenses/ExpensesLoading';
import AppRouteTree from '@/components/routing/AppRouteTree';
import RouteFallback from '@/components/routing/RouteFallback';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import AuthenticatedProviders from '@/contexts/AuthenticatedProviders';

const AuthenticatedApp = () => (
  <BrowserRouter>
    <AuthenticatedProviders>
      <RouteMetadata />
      <div className="min-h-dvh bg-background flex flex-col">
        <ErrorBoundary>
          <Suspense
            fallback={
              <RouteFallback>
                <AppLoadingSkeleton />
              </RouteFallback>
            }
          >
            <AppRouteTree />
          </Suspense>
        </ErrorBoundary>
        <OfflineBanner />
        <Toaster />
      </div>
    </AuthenticatedProviders>
  </BrowserRouter>
);

export default AuthenticatedApp;
