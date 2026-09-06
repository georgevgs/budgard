import type { ReactNode, ReactElement } from 'react';
import { AuthProvider } from '@/common/contexts/AuthProvider';

interface RootProviderProps {
  children: ReactNode;
}

export const RootProvider = ({ children }: RootProviderProps): ReactElement => {
  return <AuthProvider>{children}</AuthProvider>;
};
