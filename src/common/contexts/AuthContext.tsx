import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

// The provider component lives in AuthProvider.tsx so this module exports no
// components and useAuth keeps fast refresh.
export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
