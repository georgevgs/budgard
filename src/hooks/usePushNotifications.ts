import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';

type PushState =
  | 'loading'
  | 'unsupported'
  | 'denied'
  | 'subscribed'
  | 'unsubscribed';

type UsePushNotificationsReturn = {
  state: PushState;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
};

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

const urlBase64ToUint8Array = (base64String: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

const getRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;

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
  const [state, setState] = useState<PushState>('loading');

  useEffect(() => {
    if (!('PushManager' in window) || !('Notification' in window)) {
      setState('unsupported');

      return;
    }

    if (Notification.permission === 'denied') {
      setState('denied');

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
    if (!session?.user?.id) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        setState('denied');

        return;
      }

      if (permission !== 'granted') return;

      const reg = await getRegistration();
      if (!reg) {
        toast({
          variant: 'destructive',
          description: 'Service worker not available. Try reloading the app.',
        });

        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON();
      const p256dh = json.keys?.p256dh ?? '';
      const auth = json.keys?.auth ?? '';

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: session.user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        },
        { onConflict: 'endpoint' },
      );

      if (error) throw error;

      setState('subscribed');
    } catch {
      toast({
        variant: 'destructive',
        description: 'Failed to enable notifications. Please try again.',
      });
    }
  }, [session, toast]);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await getRegistration();
      if (!reg) return;

      const subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        setState('unsubscribed');

        return;
      }

      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint);

      await subscription.unsubscribe();

      setState('unsubscribed');
    } catch {
      toast({
        variant: 'destructive',
        description: 'Failed to disable notifications.',
      });
    }
  }, [toast]);

  return { state, subscribe, unsubscribe };
};
