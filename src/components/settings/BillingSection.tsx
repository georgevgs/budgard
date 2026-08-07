import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import SurfaceCard from '@/components/common/SurfaceCard';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { useProPlans } from '@/hooks/pro/useProPlans';
import { useToast } from '@/hooks/useToast';
import { planIdForPriceId, type ProPlanPrices } from '@/lib/proPlans';
import { hasStripeBillingManagement } from '@/lib/subscription';
import type { Subscription } from '@/types/Subscription';

const BillingSection = () => {
  const { t } = useTranslation();
  const { subscription, isPro, startPortal } = useSubscription();
  const { openUpgrade } = useUpgradeDialog();
  const { prices } = useProPlans();
  const dateLocale = useDateLocale();
  const { toast } = useToast();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const handleManage = async () => {
    setIsOpeningPortal(true);
    try {
      const url = await startPortal();
      window.location.assign(url);
    } catch {
      toast({
        variant: 'destructive',
        title: t('settings.billing.portalError'),
      });
      setIsOpeningPortal(false);
    }
  };

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {t('settings.billing.title')}
      </p>
      <SurfaceCard>
        <div className="p-4 space-y-3">
          {renderContent(
            isPro,
            subscription,
            prices,
            dateLocale,
            isOpeningPortal,
            handleManage,
            () => openUpgrade(),
            t,
          )}
        </div>
      </SurfaceCard>
    </section>
  );
};

export default BillingSection;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderContent = (
  isPro: boolean,
  subscription: Subscription | null,
  prices: ProPlanPrices,
  dateLocale: Locale,
  isOpeningPortal: boolean,
  onManage: () => void,
  onUpgrade: () => void,
  t: TFunc,
) => {
  if (!isPro || !subscription) {
    return renderFreeContent(onUpgrade, t);
  }

  return renderProContent(
    subscription,
    prices,
    dateLocale,
    isOpeningPortal,
    onManage,
    t,
  );
};

const renderFreeContent = (onUpgrade: () => void, t: TFunc) => (
  <>
    {renderRow(t('settings.billing.planLabel'), t('settings.billing.freePlan'))}
    <p className="text-xs text-muted-foreground">
      {t('settings.billing.freeBody')}
    </p>
    <Button className="w-full" onClick={onUpgrade}>
      <Sparkles className="h-4 w-4 mr-2" />
      {t('settings.billing.upgrade')}
    </Button>
  </>
);

const renderProContent = (
  subscription: Subscription,
  prices: ProPlanPrices,
  dateLocale: Locale,
  isOpeningPortal: boolean,
  onManage: () => void,
  t: TFunc,
) => (
  <>
    {renderRow(
      t('settings.billing.planLabel'),
      getPlanName(subscription, prices, t),
    )}
    {renderPeriodRow(subscription, dateLocale, t)}
    {renderTrialNotice(subscription, dateLocale, t)}
    {renderPastDueNotice(subscription, t)}
    {renderBillingManagement(subscription, isOpeningPortal, onManage, t)}
  </>
);

const renderBillingManagement = (
  subscription: Subscription,
  isOpeningPortal: boolean,
  onManage: () => void,
  t: TFunc,
) => {
  if (!hasStripeBillingManagement(subscription)) {
    return (
      <p className="text-xs text-muted-foreground">
        {t('settings.billing.noBillingHint')}
      </p>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full"
        onClick={onManage}
        disabled={isOpeningPortal}
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        {getManageLabel(isOpeningPortal, t)}
      </Button>
      <p className="text-xs text-muted-foreground">
        {t('settings.billing.manageHint')}
      </p>
    </>
  );
};

const renderRow = (label: string, value: string) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{value}</span>
  </div>
);

// Whether the current period's end renews the subscription or finishes it —
// a cancelled-but-paid-up subscription stays 'active' with
// cancel_at_period_end set until that date.
const renderPeriodRow = (
  subscription: Subscription,
  dateLocale: Locale,
  t: TFunc,
) => {
  const periodEnd = getPeriodEnd(subscription);
  if (!periodEnd) return null;

  // 'PPP' is date-fns's locale-aware long date, matching how the detail
  // sheets render dates in each language.
  const date = format(periodEnd, 'PPP', { locale: dateLocale });

  if (subscription.cancel_at_period_end) {
    return (
      <div className="space-y-1">
        {renderRow(t('settings.billing.endsLabel'), date)}
        <p className="text-xs text-muted-foreground">
          {t('settings.billing.cancelScheduled')}
        </p>
      </div>
    );
  }

  return renderRow(t('settings.billing.renewsLabel'), date);
};

const renderTrialNotice = (
  subscription: Subscription,
  dateLocale: Locale,
  t: TFunc,
) => {
  if (subscription.status !== 'trialing') return null;
  if (!subscription.trial_ends_at) return null;

  const trialEnd = new Date(subscription.trial_ends_at);
  if (!Number.isFinite(trialEnd.getTime())) return null;

  return (
    <p className="text-xs text-muted-foreground">
      {t('settings.billing.trialing', {
        date: format(trialEnd, 'PPP', { locale: dateLocale }),
      })}
    </p>
  );
};

const renderPastDueNotice = (subscription: Subscription, t: TFunc) => {
  if (subscription.status !== 'past_due') return null;

  return (
    <p className="text-xs font-medium text-destructive">
      {t('settings.billing.pastDue')}
    </p>
  );
};

const getPlanName = (
  subscription: Subscription,
  prices: ProPlanPrices,
  t: TFunc,
): string => {
  const planId = planIdForPriceId(prices, subscription.stripe_price_id);
  if (planId === 'monthly') return t('settings.billing.proMonthly');
  if (planId === 'yearly') return t('settings.billing.proYearly');

  return t('settings.billing.pro');
};

const getPeriodEnd = (subscription: Subscription): Date | null => {
  const raw = subscription.renews_at ?? subscription.ends_at;
  if (!raw) return null;

  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return null;

  return parsed;
};

const getManageLabel = (isOpeningPortal: boolean, t: TFunc): string => {
  if (isOpeningPortal) return t('settings.billing.opening');

  return t('settings.billing.manage');
};
