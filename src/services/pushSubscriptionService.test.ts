import { describe, expect, it, vi } from 'vitest';
import { supabase } from '@/lib/supabase';
import { pushSubscriptionService } from '@/services/pushSubscriptionService';

describe('pushSubscriptionService', () => {
  it('stores the complete browser subscription', async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue({ upsert } as never);

    await pushSubscriptionService.save({
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
      pushSubscriptionService.save({
        userId: 'user-1',
        endpoint: 'https://push.example/subscription',
        p256dh: 'public-key',
        auth: 'auth-secret',
      }),
    ).rejects.toEqual({ message: 'write failed' });
  });

  it('throws when deleting the subscription fails', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'delete failed' },
    });
    const remove = vi.fn().mockReturnValue({ eq });
    vi.mocked(supabase.from).mockReturnValue({ delete: remove } as never);

    await expect(
      pushSubscriptionService.remove('https://push.example/subscription'),
    ).rejects.toEqual({ message: 'delete failed' });

    expect(eq).toHaveBeenCalledWith(
      'endpoint',
      'https://push.example/subscription',
    );
  });
});
