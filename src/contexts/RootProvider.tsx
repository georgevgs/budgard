import type { ReactNode, ReactElement } from 'react';
import { AuthProvider } from '@/contexts/AuthProvider';

type RootProviderProps = {
  children: ReactNode;
};

export const RootProvider = ({ children }: RootProviderProps): ReactElement => {
  return <AuthProvider>{children}</AuthProvider>;
};
