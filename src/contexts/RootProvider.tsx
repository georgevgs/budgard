import type { ReactNode, ReactElement } from 'react';
import { AuthProvider } from '@/contexts/AuthProvider.tsx';
import { SubscriptionProvider } from '@/contexts/SubscriptionProvider.tsx';
import { UpgradeDialogProvider } from '@/contexts/UpgradeDialogProvider.tsx';
import { DataProvider } from '@/contexts/DataProvider.tsx';

type RootProviderProps = {
  children: ReactNode;
}

export const RootProvider = ({ children }: RootProviderProps): ReactElement => {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <UpgradeDialogProvider>
          <DataProvider>{children}</DataProvider>
        </UpgradeDialogProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
};
