import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscriptionService,
  type CheckoutPlan,
} from '@/services/subscriptionService';
import { isSubscriptionPro } from '@/lib/subscription';
import {
  clearSubscriptionSnapshot,
  loadSubscriptionSnapshot,
  saveSubscriptionSnapshot,
} from '@/lib/subscriptionCache';
import type { Subscription } from '@/types/Subscription';

type SubscriptionContextType = {
  subscription: Subscription | null;
  isPro: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  startCheckout: (plan: CheckoutPlan) => Promise<string>;
  startPortal: () => Promise<string>;
};

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  // Hydrate from the local snapshot so a returning Pro user is Pro on the
  // very first paint instead of flashing paywalls until the fetch resolves.
  const [subscription, setSubscription] = useState<Subscription | null>(() => {
    if (!userId) return null;

    return loadSubscriptionSnapshot(userId);
  });
  const [isLoading, setIsLoading] = useState(subscription === null);
  const lastFetchedAtRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setIsLoading(false);
      // Never leave subscription state behind on a shared device.
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

  // Covers sign-ins that happen after mount, where the lazy initializer ran
  // with no user yet: hydrate the snapshot before the network answers.
  useEffect(() => {
    if (!userId) return;

    const cached = loadSubscriptionSnapshot(userId);
    if (cached) {
      setSubscription(cached);
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Returning from the Stripe checkout tab refocuses the app; by then the
  // webhook has usually landed, so re-check for the new subscription.
  useEffect(() => {
    if (!userId) return;

    // Skip refetch on foreground if the last successful fetch is recent —
    // quick alt-tabs must not trigger a refetch storm (mirrors DataContext).
    const FRESH_WINDOW_MS = 30_000;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      const sinceLastFetch = Date.now() - lastFetchedAtRef.current;
      if (sinceLastFetch < FRESH_WINDOW_MS) return;

      void refresh();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId, refresh]);

  const startCheckout = useCallback(
    (plan: CheckoutPlan) => subscriptionService.createCheckout(plan),
    [],
  );

  const startPortal = useCallback(
    () => subscriptionService.createPortalSession(),
    [],
  );

  const value = useMemo(
    () => ({
      subscription,
      isPro: isSubscriptionPro(subscription),
      isLoading,
      refresh,
      startCheckout,
      startPortal,
    }),
    [subscription, isLoading, refresh, startCheckout, startPortal],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }

  return context;
};
