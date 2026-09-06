import type { ReactNode } from 'react';
import { SubscriptionProvider } from '@/common/contexts/SubscriptionProvider';
import { UpgradeDialogProvider } from '@/common/contexts/UpgradeDialogProvider';
import { DataProvider } from '@/common/contexts/DataProvider';
import FinancialSpaceProvider from '@/common/contexts/FinancialSpaceProvider';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';

interface Props {
  children: ReactNode;
}

// Data and billing have no consumers on the landing or legal pages. Keeping
// their providers behind the authenticated boundary avoids downloading and
// evaluating the full data layer before a signed-out visitor can see the site.
const AuthenticatedProviders = ({ children }: Props) => {
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

export default AuthenticatedProviders;

// --- Helpers ---

const SpaceDataProvider = ({ children }: Props) => {
  const { activeOwnerId } = useFinancialSpace();

  return <DataProvider key={activeOwnerId}>{children}</DataProvider>;
};
