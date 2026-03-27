import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/lib/supabase';

// Must mock authStore before importing auth module
vi.mock('@/lib/authStore', () => ({
  markIntentionalSignOut: vi.fn(),
}));

import { requestOTP, signInWithOTP, signOut, getSession, onAuthStateChange } from './auth';
import { markIntentionalSignOut } from '@/lib/authStore';

describe('auth', () => {

  it('requestOTP calls signInWithOtp with email', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as never);

    await requestOTP('test@example.com');
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' }),
    );
  });

  it('requestOTP passes captcha token when provided', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as never);

    await requestOTP('test@example.com', 'captcha-token');
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ captchaToken: 'captcha-token' }),
      }),
    );
  });

  it('signInWithOTP verifies email + token', async () => {
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
      data: { user: {}, session: {} },
      error: null,
    } as never);

    await signInWithOTP('test@example.com', '123456');
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      token: '123456',
      type: 'email',
    });
  });

  it('signOut marks intentional sign out before calling supabase', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never);

    await signOut();
    expect(markIntentionalSignOut).toHaveBeenCalled();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('getSession returns the current session', async () => {
    const session = { access_token: 'token' };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session },
      error: null,
    } as never);

    const result = await getSession();
    expect(result.data.session).toEqual(session);
  });

  it('onAuthStateChange subscribes to auth changes', () => {
    const callback = vi.fn();
    onAuthStateChange(callback);
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
  });
});
