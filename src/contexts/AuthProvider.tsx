import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import * as Sentry from '@/lib/sentry';
import { authStore } from '@/lib/authStore';
import { AuthContext } from '@/contexts/AuthContext';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { session, isLoading } = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getServerSnapshot,
  );

  useEffect(() => {
    if (session?.user) {
      Sentry.setUser({ id: session.user.id });
    } else {
      Sentry.setUser(null);
    }
  }, [session]);

  const value = {
    session,
    isLoading,
    isAuthenticated: !!session?.user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
