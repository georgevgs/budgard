import { supabase } from '@/config/supabase';
import { done, maybeRow } from '@/common/api/supabaseCrud';

// A browser's push subscription outlives the session that registered it. Left
// alone it keeps delivering the previous account's bill names and amounts to
// the lock screen after sign-out, and — because `endpoint` is unique across
// accounts — stops the next person on that browser from registering at all.
// The settings toggle and every sign-out path share these, so they sit beside
// dataService rather than inside one feature.

// Sign-out must not wait on a slow network: the local unsubscribe below kills
// the endpoint at the push service regardless, and the delivery worker deletes
// rows whose endpoint answers 404/410.
const RELEASE_TIMEOUT_MS = 3000;

export const pushDeviceApi = {
  // RLS hides other accounts' rows, so false also covers "registered, but by
  // someone else" — exactly the case where this browser must re-subscribe.
  async isRegistered(endpoint: string): Promise<boolean> {
    const found = await maybeRow<{ id: string }>(
      supabase
        .from('push_subscriptions')
        .select('id')
        .eq('endpoint', endpoint)
        .maybeSingle(),
    );

    return found !== null;
  },

  async removeDevice(endpoint: string): Promise<void> {
    await done(
      supabase.from('push_subscriptions').delete().eq('endpoint', endpoint),
    );
  },

  async removeAllDevices(userId: string): Promise<void> {
    await done(
      supabase.from('push_subscriptions').delete().eq('user_id', userId),
    );
  },
};

const getDeviceSubscription =
  async (): Promise<PushSubscription | null> => {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return null;
      }

      return await registration.pushManager.getSubscription();
    } catch {
      return null;
    }
  };

export const unsubscribeQuietly = async (
  subscription: PushSubscription | null,
): Promise<void> => {
  if (!subscription) {
    return;
  }

  try {
    await subscription.unsubscribe();
  } catch {
    // The server row is authoritative. Browser cleanup is best effort so a
    // stale local subscription cannot keep the UI stuck in an enabled state.
  }
};

// Called while the session is still valid, so RLS lets the row go. Never
// throws: nothing here may stand between a person and signing out.
export const releaseDevicePush = async (): Promise<void> => {
  const subscription = await getDeviceSubscription();
  if (!subscription) {
    return;
  }

  await settleWithin(pushDeviceApi.removeDevice(subscription.endpoint));
  await unsubscribeQuietly(subscription);
};

// "Sign out everywhere" has to reach devices this browser cannot see, and
// removing their rows is what stops delivery to a lost phone.
export const releaseAccountPush = async (
  userId: string | null,
): Promise<void> => {
  const subscription = await getDeviceSubscription();
  if (userId) {
    await settleWithin(pushDeviceApi.removeAllDevices(userId));
  }

  await unsubscribeQuietly(subscription);
};

const settleWithin = async (work: Promise<void>): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, RELEASE_TIMEOUT_MS);
  });

  try {
    await Promise.race([work.catch(() => undefined), timeout]);
  } finally {
    clearTimeout(timer);
  }
};
