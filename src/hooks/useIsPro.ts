import { useSubscription } from '@/contexts/SubscriptionContext';

export const useIsPro = () => {
  const { isPro } = useSubscription();

  return isPro;
};
