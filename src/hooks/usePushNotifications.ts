import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { pushSubscriptionService } from '@/services/pushSubscriptionService';

type PushState =
  'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

type UsePushNotificationsReturn = {
  state: PushState;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
};

const urlBase64ToUint8Array = (
  base64String: string,
): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

const getRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration();

    return reg ?? null;
  } catch {
    return null;
  }
};

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const { session } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [state, setState] = useState<PushState>(() =>
    resolveInitialPushState(),
  );

  useEffect(() => {
    if (!('PushManager' in window) || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'denied') {
      return;
    }

    // Check if already subscribed
    getRegistration().then((reg) => {
      if (!reg) {
        setState('unsubscribed');

        return;
      }

      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setState('subscribed');

          return;
        }

        setState('unsubscribed');
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!session?.user?.id) {
      return;
    }

    // Show the switch as pending while the permission prompt and push
    // registration are in flight — otherwise it visibly snaps back off.
    setState('loading');
    let createdSubscription: PushSubscription | null = null;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        setState('denied');

        return;
      }

      if (permission !== 'granted') {
        setState('unsubscribed');

        return;
      }

      const reg = await getRegistration();
      if (!reg) {
        setState('unsubscribed');
        toast({
          variant: 'destructive',
          description: t('settings.notifications.swUnavailable'),
        });

        return;
      }

      createdSubscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY as string,
        ),
      });

      const json = createdSubscription.toJSON();
      const p256dh = json.keys?.p256dh ?? '';
      const auth = json.keys?.auth ?? '';

      await pushSubscriptionService.save({
        userId: session.user.id,
        endpoint: createdSubscription.endpoint,
        p256dh,
        auth,
      });

      setState('subscribed');
    } catch {
      await unsubscribeQuietly(createdSubscription);
      setState('unsubscribed');
      toast({
        variant: 'destructive',
        description: t('settings.notifications.enableFailed'),
      });
    }
  }, [session, toast, t]);

  const unsubscribe = useCallback(async () => {
    setState('loading');
    try {
      const reg = await getRegistration();
      if (!reg) {
        setState('unsubscribed');

        return;
      }

      const subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        setState('unsubscribed');

        return;
      }

      await pushSubscriptionService.remove(subscription.endpoint);
      await unsubscribeQuietly(subscription);

      setState('unsubscribed');
    } catch {
      setState('subscribed');
      toast({
        variant: 'destructive',
        description: t('settings.notifications.disableFailed'),
      });
    }
  }, [toast, t]);

  return { state, subscribe, unsubscribe };
};

// --- Helpers ---

// Environment support and permission denial are known synchronously, so they
// resolve during the first render; the mount effect only handles the async
// subscription lookup.
const resolveInitialPushState = (): PushState => {
  if (!('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  return 'loading';
};

const unsubscribeQuietly = async (
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
