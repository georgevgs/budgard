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

export const getSession = () => {
  return supabase.auth.getSession();
};

export const onAuthStateChange = (callback: (session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
};
