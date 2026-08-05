import type { ReactNode } from 'react';
import { SubscriptionProvider } from '@/contexts/SubscriptionProvider';
import { UpgradeDialogProvider } from '@/contexts/UpgradeDialogProvider';
import { DataProvider } from '@/contexts/DataProvider';

type Props = {
  children: ReactNode;
};

// Data and billing have no consumers on the landing or legal pages. Keeping
// their providers behind the authenticated boundary avoids downloading and
// evaluating the full data layer before a signed-out visitor can see the site.
const AuthenticatedProviders = ({ children }: Props) => {
  return (
    <SubscriptionProvider>
      <UpgradeDialogProvider>
        <DataProvider>{children}</DataProvider>
      </UpgradeDialogProvider>
    </SubscriptionProvider>
  );
};

export default AuthenticatedProviders;
