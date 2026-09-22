import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SubscriptionProvider } from '@/common/contexts/SubscriptionProvider';
import { UpgradeDialogProvider } from '@/common/contexts/UpgradeDialogProvider';
import { DataProvider } from '@/common/contexts/DataProvider';
import { FinancialSpaceProvider } from '@/common/contexts/FinancialSpaceProvider';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { useSubscription } from '@/common/contexts/SubscriptionContext';
import { AppLoadingSkeleton } from '@/common/components/common/AppLoadingSkeleton';
import { Button } from '@/common/ui/button';

type AuthenticatedProvidersProps = {
  children: ReactNode;
};

// Data and billing have no consumers on the landing or legal pages. Keeping
// their providers behind the authenticated boundary avoids downloading and
// evaluating the full data layer before a signed-out visitor can see the site.
export const AuthenticatedProviders = ({
  children,
}: AuthenticatedProvidersProps) => {
  return (
    <SubscriptionProvider>
      <UpgradeDialogProvider>
        <FinancialSpaceProvider>
          <SpaceDataProvider>{children}</SpaceDataProvider>
        </FinancialSpaceProvider>
      </UpgradeDialogProvider>
    </SubscriptionProvider>
  );
};

const SpaceDataProvider = ({ children }: AuthenticatedProvidersProps) => {
  const { t } = useTranslation();
  const { activeOwnerId, isLoading, error, refreshShares } =
    useFinancialSpace();

  // A stored shared owner must be validated before it is allowed to choose a
  // data session. If the share was revoked, starting its requests early would
  // create avoidable RLS failures and error toasts before the provider can
  // fall back to the user's own space.
  if (isLoading) {
    return <AppLoadingSkeleton />;
  }
  if (error) {
    return (
      <main
        role="alert"
        className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center"
      >
        <p className="text-sm text-muted-foreground">
          {t('common.loadDataFailed')}
        </p>
        <Button variant="outline" onClick={() => void refreshShares()}>
          {t('common.tryAgain')}
        </Button>
      </main>
    );
  }

  return (
    <DataProvider key={activeOwnerId}>
      <SubscriptionReadinessGate>{children}</SubscriptionReadinessGate>
    </DataProvider>
  );
};

// Keep the data provider mounted so its fetch can run alongside the
// subscription request, but do not let routes interpret an unknown plan as
// Free. Otherwise Pro controls disappear on the first frame and pop back in
// once the subscription row arrives.
const SubscriptionReadinessGate = ({
  children,
}: AuthenticatedProvidersProps) => {
  const { isLoading: isSubscriptionLoading } = useSubscription();

  if (isSubscriptionLoading) {
    return <AppLoadingSkeleton />;
  }

  return children;
};
