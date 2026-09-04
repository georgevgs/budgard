import { createContext, useContext } from 'react';
import type { CheckoutPlan } from '@/services/subscriptionService';
import type { Subscription } from '@/types/Subscription';

type SubscriptionContextType = {
  subscription: Subscription | null;
  isPro: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  startCheckout: (plan: CheckoutPlan) => Promise<string>;
  startPortal: () => Promise<string>;
};

// The provider component lives in SubscriptionProvider.tsx so this module
// exports no components and useSubscription keeps fast refresh.
export const SubscriptionContext =
  createContext<SubscriptionContextType | null>(null);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      'useSubscription must be used within a SubscriptionProvider',
    );
  }

  return context;
};
