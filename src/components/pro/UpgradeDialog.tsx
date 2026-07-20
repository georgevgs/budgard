import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Check from 'lucide-react/dist/esm/icons/check';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';
import { useToast } from '@/hooks/useToast';
import { useProPlans, type ProPlansDisplay } from '@/hooks/pro/useProPlans';
import type { CheckoutPlan } from '@/services/subscriptionService';
import { cn } from '@/lib/utils';

const FEATURE_KEYS = ['f1', 'f2', 'f3', 'f4', 'f5'];

const UpgradeDialog = () => {
  const { t } = useTranslation();
  const { isUpgradeOpen, closeUpgrade, preferredPlan } = useUpgradeDialog();
  const { startCheckout } = useSubscription();
  const { toast } = useToast();
  const plans = useProPlans();
  const [plan, setPlan] = useState<CheckoutPlan>(preferredPlan);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Each open starts on the caller's preferred plan (e.g. the plan chosen on
  // the landing page) instead of whatever the last visit left selected.
  useEffect(() => {
    if (isUpgradeOpen) {
      setPlan(preferredPlan);
    }
  }, [isUpgradeOpen, preferredPlan]);

  const handleOpenChange = (open: boolean) => {
    if (!open) closeUpgrade();
  };

  const handleCheckout = async () => {
    setIsRedirecting(true);
    try {
      const url = await startCheckout(plan);
      window.location.assign(url);
    } catch {
      toast({ variant: 'destructive', title: t('pro.checkoutError') });
      setIsRedirecting(false);
    }
  };

  return (
    <Dialog open={isUpgradeOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[420px]"
        onOpenChange={handleOpenChange}
      >
        <DialogHeader>
          <DialogTitle>{t('pro.upgradeTitle')}</DialogTitle>
          <DialogDescription>{t('pro.dialogSubtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {renderPlanToggle(plan, setPlan, t)}
          {renderPrice(plan, plans, t)}
          <ul className="space-y-2.5">
            {FEATURE_KEYS.map((key) => renderFeature(t(`pro.features.${key}`)))}
          </ul>
          <Button
            onClick={handleCheckout}
            disabled={isRedirecting}
            className="w-full h-11 rounded-full"
          >
            {renderCtaLabel(isRedirecting, t)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeDialog;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderPlanToggle = (
  plan: CheckoutPlan,
  setPlan: (plan: CheckoutPlan) => void,
  t: TFunc,
) => (
  <div className="flex justify-center">
    <div className="inline-flex p-1 rounded-full bg-muted border border-border/60">
      {renderToggleButton('monthly', plan, setPlan, t)}
      {renderToggleButton('yearly', plan, setPlan, t)}
    </div>
  </div>
);

const renderToggleButton = (
  value: CheckoutPlan,
  current: CheckoutPlan,
  setPlan: (plan: CheckoutPlan) => void,
  t: TFunc,
) => {
  const isActive = current === value;

  return (
    <button
      type="button"
      onClick={() => setPlan(value)}
      className={cn(
        'px-4 h-9 rounded-full text-sm font-medium transition-colors',
        isActive && 'bg-background text-foreground shadow-sm',
        !isActive && 'text-muted-foreground hover:text-foreground',
      )}
    >
      {t(`pro.${value}`)}
      {renderSaveBadge(value, t)}
    </button>
  );
};

const renderSaveBadge = (value: CheckoutPlan, t: TFunc) => {
  if (value !== 'yearly') return null;

  return (
    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
      {t('pro.save')}
    </span>
  );
};

const renderPrice = (plan: CheckoutPlan, plans: ProPlansDisplay, t: TFunc) => {
  if (plan === 'monthly') {
    return (
      <div className="text-center">
        <span className="text-4xl font-semibold tabular-nums tracking-tight">
          {plans.monthlyLabel}
        </span>
        <span className="ml-1.5 text-sm text-muted-foreground">
          {t('pro.perMonth')}
        </span>
      </div>
    );
  }

  return (
    <div className="text-center">
      <span className="text-4xl font-semibold tabular-nums tracking-tight">
        {plans.yearlyPerMonthLabel}
      </span>
      <span className="ml-1.5 text-sm text-muted-foreground">
        {t('pro.perMonth')}
      </span>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        {t('pro.billedYearly', { price: plans.yearlyLabel })}
      </p>
    </div>
  );
};

const renderFeature = (label: string) => (
  <li key={label} className="flex items-start gap-3 text-sm">
    <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
    <span className="text-foreground/85">{label}</span>
  </li>
);

const renderCtaLabel = (isRedirecting: boolean, t: TFunc): string => {
  if (isRedirecting) return t('pro.redirecting');

  return t('pro.cta');
};
