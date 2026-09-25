import { describe, expect, it, vi } from 'vitest';
import { supabase } from '@/config/supabase';
import { settingsApi } from '@/pages/settings/settingsApi';

describe('settingsApi push subscriptions', () => {
  it('stores the complete browser subscription', async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue({ upsert } as never);

    await settingsApi.savePushSubscription({
      userId: 'user-1',
      endpoint: 'https://push.example/subscription',
      p256dh: 'public-key',
      auth: 'auth-secret',
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        endpoint: 'https://push.example/subscription',
        p256dh: 'public-key',
        auth: 'auth-secret',
      },
      { onConflict: 'endpoint' },
    );
  });

  it('throws when persisting the subscription fails', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      upsert: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'write failed' },
      }),
    } as never);

    await expect(
      settingsApi.savePushSubscription({
        userId: 'user-1',
        endpoint: 'https://push.example/subscription',
        p256dh: 'public-key',
        auth: 'auth-secret',
      }),
    ).rejects.toEqual({ message: 'write failed' });
  });
});
