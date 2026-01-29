import type { ReactNode, ReactElement } from 'react';
import { AuthProvider } from '@/contexts/AuthContext.tsx';
import { DataProvider } from '@/contexts/DataContext.tsx';

interface RootProviderProps {
  children: ReactNode;
}

export const RootProvider = ({ children }: RootProviderProps): ReactElement => {
  return (
    <AuthProvider>
      <DataProvider>{children}</DataProvider>
    </AuthProvider>
  );
};
