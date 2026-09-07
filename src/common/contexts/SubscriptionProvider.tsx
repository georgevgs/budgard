import { useMemo, type ReactNode } from 'react';
import { useSubscriptionState } from '@/common/hooks/useSubscriptionState';
import {
  subscriptionService,
  type CheckoutPlan,
} from '@/common/api/subscriptionService';
import { isSubscriptionPro } from '@/constants/subscription';
import { SubscriptionContext } from '@/common/contexts/SubscriptionContext';

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { subscription, isLoading, refresh } = useSubscriptionState();

  const value = useMemo(
    () => ({
      subscription,
      isPro: isSubscriptionPro(subscription),
      isLoading,
      refresh,
      startCheckout,
      startPortal,
    }),
    [subscription, isLoading, refresh],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

// Neither call reads any provider state, so they are module-level constants
// rather than useCallback identities that have to be threaded through the memo.
const startCheckout = (plan: CheckoutPlan) =>
  subscriptionService.createCheckout(plan);

const startPortal = () => subscriptionService.createPortalSession();
