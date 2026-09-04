import { supabase } from '@/lib/supabase';
import { done } from '@/services/supabaseCrud';

export type PushSubscriptionPayload = {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export const pushSubscriptionService = {
  async save({
    userId,
    endpoint,
    p256dh,
    auth,
  }: PushSubscriptionPayload): Promise<void> {
    await done(
      supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
        },
        { onConflict: 'endpoint' },
      ),
    );
  },

  async remove(endpoint: string): Promise<void> {
    await done(
      supabase.from('push_subscriptions').delete().eq('endpoint', endpoint),
    );
  },
};
