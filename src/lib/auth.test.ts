import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/lib/supabase';

// Must mock authStore before importing auth module
vi.mock('@/lib/authStore', () => ({
  markIntentionalSignOut: vi.fn(),
}));

import { requestOTP, signInWithOTP, signOut } from '@/lib/auth';
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
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    } as never);

    await signOut();
    expect(markIntentionalSignOut).toHaveBeenCalled();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
