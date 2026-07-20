import type { ReactNode, ReactElement } from 'react';
import { AuthProvider } from '@/contexts/AuthContext.tsx';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext.tsx';
import { UpgradeDialogProvider } from '@/contexts/UpgradeDialogContext.tsx';
import { DataProvider } from '@/contexts/DataContext.tsx';

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
