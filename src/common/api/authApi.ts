import { supabase } from '@/config/supabase';
import { markIntentionalSignOut } from '@/constants/authStore';

// Auth mutations are sitewide, not feature-scoped: routing, settings, security
// and the login flow all call them. They live beside dataService rather than in
// any one `<feature>Api.ts` for that reason.
export const authApi = {
  async requestOTP(email: string, captchaToken?: string) {
    return supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        captchaToken,
      },
    });
  },

  async signInWithOTP(email: string, token: string) {
    return supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
  },

  async signOut() {
    markIntentionalSignOut();

    return supabase.auth.signOut();
  },

  // Revokes every refresh token for the account, not just this browser's.
  // Supabase does not expose a per-device session list to the client — that
  // needs a service-role call — so "sign out everywhere" is the honest thing
  // this can offer without an edge function standing behind it.
  async signOutEverywhere() {
    markIntentionalSignOut();

    return supabase.auth.signOut({ scope: 'global' });
  },
};
