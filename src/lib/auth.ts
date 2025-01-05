import { supabase } from './supabase';

export async function sendMagicLink(email: string) {
  const redirectTo = `${window.location.origin}/auth/callback`;

  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });
}

export async function handleAuthRedirect() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;

    // If we have a session and we're in the browser (not PWA), redirect back to PWA
    if (session && !window.matchMedia('(display-mode: standalone)').matches) {
      // Store the session in localStorage
      localStorage.setItem('pendingAuthSession', JSON.stringify(session));

      // Try to redirect back to PWA using custom URL scheme
      window.location.href = `budgard://auth/callback`;

      // Fallback - redirect to PWA's origin after a short delay
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 1000);
    }
  } catch (error) {
    console.error('Error handling auth redirect:', error);
  }
}

export async function checkPendingAuth() {
  const pendingSession = localStorage.getItem('pendingAuthSession');
  if (pendingSession) {
    try {
      // Clear the pending session immediately to prevent loops
      localStorage.removeItem('pendingAuthSession');

      // Ensure we have a valid session with Supabase
      await supabase.auth.setSession(JSON.parse(pendingSession));

      // Return true to indicate successful auth restoration
      return true;
    } catch (error) {
      console.error('Error restoring auth session:', error);
    }
  }
  return false;
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