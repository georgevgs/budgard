import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { markIntentionalSignOut } from '@/lib/authStore';

export const requestOTP = async (email: string, captchaToken?: string) => {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      captchaToken,
    },
  });
};

export const signInWithOTP = async (email: string, token: string) => {
  return supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
};

export const signOut = async () => {
  markIntentionalSignOut();

  return supabase.auth.signOut();
};

// Revokes every refresh token for the account, not just this browser's.
// Supabase does not expose a per-device session list to the client — that
// needs a service-role call — so "sign out everywhere" is the honest thing
// this can offer without an edge function standing behind it.
export const signOutEverywhere = async () => {
  markIntentionalSignOut();

  return supabase.auth.signOut({ scope: 'global' });
};

export const getSession = () => {
  return supabase.auth.getSession();
};

export const onAuthStateChange = (callback: (session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
};
