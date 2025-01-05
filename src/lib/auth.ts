import { supabase } from './supabase';

export async function requestOTP(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });
}

export async function signInWithOTP(email: string, token: string) {
  return supabase.auth.verifyOtp({
    email,
    token,
    type: 'email'
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export function getSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(callback: (session: any) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}