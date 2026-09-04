import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscriptionService } from '@/services/subscriptionService';
import {
  clearSubscriptionSnapshot,
  loadSubscriptionSnapshot,
  saveSubscriptionSnapshot,
} from '@/lib/subscriptionCache';
import type { Subscription } from '@/types/Subscription';

export type SubscriptionState = {
  subscription: Subscription | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

// Owns the subscription row and everything that keeps it current: the local
// snapshot, the auth transition, the initial fetch, and the refetch when the
// user comes back from the Stripe checkout tab. SubscriptionProvider is left
// as the context wiring around it.
export const useSubscriptionState = (): SubscriptionState => {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  // Hydrate from the local snapshot so a returning Pro user is Pro on the
  // very first paint instead of flashing paywalls until the fetch resolves.
  const [subscription, setSubscription] = useState<Subscription | null>(() => {
    if (!userId) {
      return null;
    }

    return loadSubscriptionSnapshot(userId);
  });
  const [isLoading, setIsLoading] = useState(subscription === null);
  const lastFetchedAtRef = useRef(0);

  // Covers auth transitions after mount, where the lazy initializer ran with
  // a different (or no) user: hydrate the snapshot before the network answers,
  // and drop the previous user's subscription the moment they sign out. Runs
  // during render (guarded) so the new auth state never paints stale Pro data.
  const [prevUserId, setPrevUserId] = useState(userId);
  if (userId !== prevUserId) {
    setPrevUserId(userId);
    if (userId) {
      const cached = loadSubscriptionSnapshot(userId);
      setSubscription(cached);
      setIsLoading(cached === null);
    } else {
      setSubscription(null);
      setIsLoading(false);
    }
  }

  const refresh = useCallback(async () => {
    if (!userId) {
      // State was already reset by the sign-out adjust above; just make sure
      // no subscription snapshot lingers behind on a shared device.
      clearSubscriptionSnapshot();

      return;
    }

    try {
      const data = await subscriptionService.getSubscription();
      lastFetchedAtRef.current = Date.now();
      setSubscription(data);
      saveSubscriptionSnapshot(userId, data);
    } catch {
      // Keep the last known state. A failed fetch never revokes access
      // mid-session; a missing row simply means free tier.
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial fetch per auth state. Inlined rather than calling refresh() —
  // the effect rule treats a synchronous refresh() call as a sync setState
  // cascade even though its writes all sit behind awaits, so the effect keeps
  // every setState inside promise continuations instead.
  useEffect(() => {
    lastFetchedAtRef.current = 0;
    if (!userId) {
      // State was already reset by the sign-out adjust above; just make sure
      // no subscription snapshot lingers behind on a shared device.
      clearSubscriptionSnapshot();

      return;
    }

    let cancelled = false;
    subscriptionService
      .getSubscription()
      .then((data) => {
        if (cancelled) {
          return;
        }
        lastFetchedAtRef.current = Date.now();
        setSubscription(data);
        saveSubscriptionSnapshot(userId, data);
      })
      .catch(() => {
        // Keep the last known state. A failed fetch never revokes access
        // mid-session; a missing row simply means free tier.
      })
      .finally(() => {
        if (cancelled) {
          return;
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Returning from the Stripe checkout tab refocuses the app; by then the
  // webhook has usually landed, so re-check for the new subscription.
  useEffect(() => {
    if (!userId) {
      return;
    }

    // Skip refetch on foreground if the last successful fetch is recent —
    // quick alt-tabs must not trigger a refetch storm (mirrors DataProvider).
    const FRESH_WINDOW_MS = 30_000;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      const sinceLastFetch = Date.now() - lastFetchedAtRef.current;
      if (sinceLastFetch < FRESH_WINDOW_MS) {
        return;
      }

      void refresh();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId, refresh]);

  return { subscription, isLoading, refresh };
};
