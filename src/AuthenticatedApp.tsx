import { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { OfflineBanner } from '@/common/components/common/OfflineBanner';
import { RouteMetadata } from '@/common/components/common/RouteMetadata';
import { AppLoadingSkeleton } from '@/common/components/common/AppLoadingSkeleton';
import { AppRouteTree } from '@/common/components/routing/AppRouteTree';
import { RouteFallback } from '@/common/components/routing/RouteFallback';
import { ErrorBoundary } from '@/common/ui/error-boundary';
import { Toaster } from '@/common/ui/toaster';
import { AuthenticatedProviders } from '@/common/contexts/AuthenticatedProviders';

const AuthenticatedApp = () => {
  return (
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
};

export default AuthenticatedApp;
