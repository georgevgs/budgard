import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '@/contexts/SubscriptionContext';
import ProUpsellCard from '@/components/pro/ProUpsellCard';

type Props = {
  titleKey: string;
  descriptionKey: string;
  children: ReactNode;
};

// Route-level gate for Pro-only screens. While the subscription is still
// loading it renders the screen optimistically so Pro users never see a
// lock flash; free users get the upsell as soon as the state settles.
const ProRoute = ({ titleKey, descriptionKey, children }: Props) => {
  const { t } = useTranslation();
  const { isPro, isLoading } = useSubscription();

  if (isLoading || isPro) {
    return children;
  }

  return (
    <div className="page-shell">
      <ProUpsellCard title={t(titleKey)} description={t(descriptionKey)} />
    </div>
  );
};

export default ProRoute;
