import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/config/supabase';

const lastCallOrder = (fn: unknown): number => {
  const order = vi.mocked(fn as () => void).mock.invocationCallOrder;

  return order[order.length - 1] ?? 0;
};

// Must mock authStore before importing the auth module
vi.mock('@/constants/authStore', () => ({
  markIntentionalSignOut: vi.fn(),
  getCurrentUserId: vi.fn(() => 'user-1'),
}));

vi.mock('@/common/api/pushDeviceApi', () => ({
  releaseDevicePush: vi.fn().mockResolvedValue(undefined),
  releaseAccountPush: vi.fn().mockResolvedValue(undefined),
}));

import { authApi } from '@/common/api/authApi';
import { markIntentionalSignOut } from '@/constants/authStore';
import {
  releaseAccountPush,
  releaseDevicePush,
} from '@/common/api/pushDeviceApi';

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

  // After the token is gone RLS will not let the row be deleted, and the
  // device would keep showing this account's bills on its lock screen.
  it('signOut releases this device push row while the session is still valid', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    } as never);

    await authApi.signOut();

    expect(releaseDevicePush).toHaveBeenCalled();
    expect(lastCallOrder(releaseDevicePush)).toBeLessThan(
      lastCallOrder(supabase.auth.signOut),
    );
  });

  it('signOutEverywhere releases every device row for the account', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    } as never);

    await authApi.signOutEverywhere();

    expect(releaseAccountPush).toHaveBeenCalledWith('user-1');
    expect(lastCallOrder(releaseAccountPush)).toBeLessThan(
      lastCallOrder(supabase.auth.signOut),
    );
    expect(supabase.auth.signOut).toHaveBeenLastCalledWith({ scope: 'global' });
  });
});
