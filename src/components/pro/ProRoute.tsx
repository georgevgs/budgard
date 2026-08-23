import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '@/contexts/SubscriptionContext';
import PageHeader from '@/components/common/PageHeader';
import ProUpsellCard from '@/components/pro/ProUpsellCard';

type Props = {
  /** The screen's own name. The gate replaces the whole screen, so it has to
   *  keep the screen's header — otherwise the one state every free user sees
   *  is the only one in the app with no title and no way back. */
  screenTitleKey: string;
  titleKey: string;
  descriptionKey: string;
  children: ReactNode;
};

// Route-level gate for Pro-only screens. While the subscription is still
// loading it renders the screen optimistically so Pro users never see a
// lock flash; free users get the upsell as soon as the state settles.
const ProRoute = ({
  screenTitleKey,
  titleKey,
  descriptionKey,
  children,
}: Props) => {
  const { t } = useTranslation();
  const { isPro, isLoading } = useSubscription();

  if (isLoading || isPro) {
    return children;
  }

  return (
    <div className="page-shell">
      <PageHeader title={t(screenTitleKey)} />
      <div className="mt-5">
        <ProUpsellCard title={t(titleKey)} description={t(descriptionKey)} />
      </div>
    </div>
  );
};

export default ProRoute;
