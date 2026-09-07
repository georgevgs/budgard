import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/config/supabase';

// Must mock authStore before importing the auth module
vi.mock('@/constants/authStore', () => ({
  markIntentionalSignOut: vi.fn(),
}));

import { authApi } from '@/common/api/authApi';
import { markIntentionalSignOut } from '@/constants/authStore';

describe('authApi', () => {
  it('requestOTP calls signInWithOtp with email', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as never);

    await authApi.requestOTP('test@example.com');
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' }),
    );
  });

  it('requestOTP passes captcha token when provided', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as never);

    await authApi.requestOTP('test@example.com', 'captcha-token');
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

    await authApi.signInWithOTP('test@example.com', '123456');
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

    await authApi.signOut();
    expect(markIntentionalSignOut).toHaveBeenCalled();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
