import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PaywallHero from '@/components/pro/PaywallHero';
import PaywallFeatures from '@/components/pro/PaywallFeatures';
import PaywallPlans from '@/components/pro/PaywallPlans';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';
import { useToast } from '@/hooks/useToast';
import { useProPlans } from '@/hooks/pro/useProPlans';
import type { CheckoutPlan } from '@/services/subscriptionService';

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
        className="gap-0 p-0 sm:max-w-[400px]"
        onOpenChange={handleOpenChange}
      >
        <div className="flex-1 overflow-y-auto px-6 pb-4 pt-10">
          <PaywallHero />
          <div className="mt-6">
            <PaywallFeatures />
          </div>
          <div className="mt-6">
            <PaywallPlans plan={plan} onSelect={setPlan} plans={plans} />
          </div>
        </div>
        <div className="space-y-3 border-t border-border/40 px-6 pb-6 pt-4">
          <Button
            onClick={handleCheckout}
            disabled={isRedirecting}
            className="h-12 w-full rounded-full text-base font-semibold shadow-lg shadow-primary/25"
          >
            {renderCtaLabel(isRedirecting, t)}
          </Button>
          {renderFootnote(t, closeUpgrade)}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeDialog;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderCtaLabel = (isRedirecting: boolean, t: TFunc): string => {
  if (isRedirecting) return t('pro.redirecting');

  return t('pro.cta');
};

// "Cancel anytime · Terms · Privacy" — the reassurance line every good
// paywall closes on. Links close the dialog so the page behind is visible.
const renderFootnote = (t: TFunc, onNavigate: () => void) => (
  <p className="text-center text-[11px] text-muted-foreground">
    {t('pro.cancelAnytime')}
    <span aria-hidden className="mx-1.5">
      ·
    </span>
    <Link
      to="/terms"
      onClick={onNavigate}
      className="underline underline-offset-2 hover:text-foreground"
    >
      {t('pro.legal.terms')}
    </Link>
    <span aria-hidden className="mx-1.5">
      ·
    </span>
    <Link
      to="/privacy"
      onClick={onNavigate}
      className="underline underline-offset-2 hover:text-foreground"
    >
      {t('pro.legal.privacy')}
    </Link>
  </p>
);
