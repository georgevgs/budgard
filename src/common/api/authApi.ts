import { supabase } from '@/config/supabase';
import {
  getCurrentUserId,
  markIntentionalSignOut,
} from '@/constants/authStore';
import {
  releaseAccountPush,
  releaseDevicePush,
} from '@/common/api/pushDeviceApi';

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

  // The push row is released first, while the session can still delete it.
  async signOut() {
    markIntentionalSignOut();
    await releaseDevicePush();

    return supabase.auth.signOut();
  },

  // Revokes every refresh token for the account, not just this browser's.
  // Supabase does not expose a per-device session list to the client — that
  // needs a service-role call — so "sign out everywhere" is the honest thing
  // this can offer without an edge function standing behind it.
  //
  // Revoking tokens does not stop push delivery, so every device row goes too.
  async signOutEverywhere() {
    markIntentionalSignOut();
    await releaseAccountPush(getCurrentUserId());

    return supabase.auth.signOut({ scope: 'global' });
  },
};
