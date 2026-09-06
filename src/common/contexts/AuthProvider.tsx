import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { setUser } from '@/config/sentry';
import { authStore } from '@/constants/authStore';
import { AuthContext } from '@/common/contexts/AuthContext';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { session, isLoading } = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getServerSnapshot,
  );

  useEffect(() => {
    if (session?.user) {
      setUser({ id: session.user.id });
    } else {
      setUser(null);
    }
  }, [session]);

  const value = {
    session,
    isLoading,
    isAuthenticated: !!session?.user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
