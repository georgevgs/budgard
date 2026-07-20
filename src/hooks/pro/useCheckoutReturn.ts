import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { celebrate } from '@/lib/confetti';
import { haptics } from '@/lib/haptics';
import { toast } from '@/hooks/useToast';

// Handles the redirect back from Stripe checkout (?checkout=success or
// ?checkout=cancelled). The webhook is the source of truth for the
// subscription row; this hook just refreshes and celebrates.
export const useCheckoutReturn = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { refresh } = useSubscription();
  const { t } = useTranslation();

  useEffect(() => {
    const status = searchParams.get('checkout');
    if (!status) return;

    setSearchParams({}, { replace: true });

    if (status === 'success') {
      void refresh();
      celebrate();
      haptics.success();
      toast({
        variant: 'success',
        title: t('pro.successTitle'),
        description: t('pro.successBody'),
        duration: 8000,
      });

      return;
    }

    if (status === 'cancelled') {
      toast({
        title: t('pro.cancelledTitle'),
        description: t('pro.cancelledBody'),
      });
    }
  }, [searchParams, setSearchParams, refresh, t]);
};
