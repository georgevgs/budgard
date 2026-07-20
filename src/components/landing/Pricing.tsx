import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import SectionShell from '@/components/landing/SectionShell';
import EyebrowLabel from '@/components/landing/EyebrowLabel';
import Reveal from '@/components/landing/Reveal';
import Check from 'lucide-react/dist/esm/icons/check';
import { cn } from '@/lib/utils';
import { useProPlans, type ProPlansDisplay } from '@/hooks/pro/useProPlans';
import { yearlySavingsPercent, type ProPlanId } from '@/lib/proPlans';

type Props = {
  onGetStarted: () => void;
  onGetPro: (plan: Cycle) => void;
};

type Tx = (key: string, opts?: Record<string, unknown>) => string;
type Cycle = ProPlanId;

const Pricing = ({ onGetStarted, onGetPro }: Props) => {
  const { t } = useTranslation();
  const plans = useProPlans();
  const [cycle, setCycle] = useState<Cycle>('yearly');

  return (
    <SectionShell id="pricing" tone="default">
      <Reveal>{renderHeader(t)}</Reveal>
      <Reveal delay={100}>{renderToggle(t, cycle, setCycle, plans)}</Reveal>
      <div className="mt-10 grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
        <Reveal delay={150}>{renderFreeCard(t, onGetStarted)}</Reveal>
        <Reveal delay={250}>{renderProCard(t, cycle, plans, onGetPro)}</Reveal>
      </div>
    </SectionShell>
  );
};

export default Pricing;

const renderHeader = (t: Tx) => (
  <div className="text-center max-w-2xl mx-auto">
    <EyebrowLabel>{t('landing.pricing.eyebrow')}</EyebrowLabel>
    <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
      {t('landing.pricing.heading')}
    </h2>
    <p className="mt-4 text-base text-muted-foreground">
      {t('landing.pricing.body')}
    </p>
  </div>
);

const renderToggle = (
  t: Tx,
  cycle: Cycle,
  setCycle: (c: Cycle) => void,
  plans: ProPlansDisplay,
) => (
  <div className="mt-8 flex justify-center">
    <div className="inline-flex p-1 rounded-full bg-muted border border-border/60">
      {renderToggleButton(t, 'monthly', cycle, setCycle, plans)}
      {renderToggleButton(t, 'yearly', cycle, setCycle, plans)}
    </div>
  </div>
);

const renderToggleButton = (
  t: Tx,
  value: Cycle,
  current: Cycle,
  setCycle: (c: Cycle) => void,
  plans: ProPlansDisplay,
) => {
  const isActive = current === value;
  const labelKey = getLabelKey(value);

  return (
    <button
      type="button"
      onClick={() => setCycle(value)}
      className={cn(
        'px-4 h-9 rounded-full text-sm font-medium transition-colors',
        isActive && 'bg-background text-foreground shadow-sm',
        !isActive && 'text-muted-foreground hover:text-foreground',
      )}
    >
      {t(labelKey)}
      {renderSaveBadge(t, value, plans)}
    </button>
  );
};

const getLabelKey = (value: Cycle): string => {
  if (value === 'monthly') {
    return 'landing.pricing.monthly';
  }

  return 'landing.pricing.yearly';
};

// Computed from the live prices so the badge can never drift from what
// checkout actually charges — same basis as the paywall's savings badge.
const renderSaveBadge = (t: Tx, value: Cycle, plans: ProPlansDisplay) => {
  if (value !== 'yearly') return null;

  const percent = yearlySavingsPercent(plans.prices);
  if (percent <= 0) return null;

  return (
    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
      {t('landing.pricing.savePercent', { percent })}
    </span>
  );
};

const renderFreeCard = (t: Tx, onGetStarted: () => void) => (
  <div className="rounded-3xl border border-border/60 bg-card p-8 flex flex-col">
    <h3 className="text-lg font-semibold tracking-tight">
      {t('landing.pricing.free.title')}
    </h3>
    <p className="mt-1 text-sm text-muted-foreground">
      {t('landing.pricing.free.subtitle')}
    </p>
    <div className="mt-6 flex items-baseline gap-1.5">
      <span className="text-5xl font-semibold tabular-nums tracking-tight">
        €0
      </span>
      <span className="text-sm text-muted-foreground">
        {t('landing.pricing.forever')}
      </span>
    </div>
    <Button
      onClick={onGetStarted}
      variant="outline"
      className="mt-6 rounded-full h-11"
    >
      {t('landing.pricing.free.cta')}
    </Button>
    <ul className="mt-8 space-y-3">
      {[1, 2, 3, 4, 5, 6].map((n) =>
        renderFeature(t(`landing.pricing.free.feature${n}`)),
      )}
    </ul>
  </div>
);

const renderProCard = (
  t: Tx,
  cycle: Cycle,
  plans: ProPlansDisplay,
  onGetPro: (plan: Cycle) => void,
) => (
  <div className="relative rounded-3xl border-2 border-primary/40 bg-card p-8 flex flex-col shadow-xl shadow-primary/10">
    <div className="absolute -top-3 left-8 px-2.5 h-6 inline-flex items-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold tracking-wide">
      {t('landing.pricing.recommended')}
    </div>
    <h3 className="text-lg font-semibold tracking-tight">
      {t('landing.pricing.pro.title')}
    </h3>
    <p className="mt-1 text-sm text-muted-foreground">
      {t('landing.pricing.pro.subtitle')}
    </p>
    {renderProPrice(t, cycle, plans)}
    <Button onClick={() => onGetPro(cycle)} className="mt-6 rounded-full h-11">
      {t('landing.pricing.pro.cta')}
    </Button>
    <ul className="mt-8 space-y-3">
      {[1, 2, 3, 4, 5, 6, 7].map((n) =>
        renderFeature(t(`landing.pricing.pro.feature${n}`)),
      )}
    </ul>
  </div>
);

const renderProPrice = (t: Tx, cycle: Cycle, plans: ProPlansDisplay) => {
  if (cycle === 'monthly') {
    return (
      <div className="mt-6 flex items-baseline gap-1.5">
        <span className="text-5xl font-semibold tabular-nums tracking-tight">
          {plans.monthlyLabel}
        </span>
        <span className="text-sm text-muted-foreground">
          {t('landing.pricing.perMonth')}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-baseline gap-1.5">
        <span className="text-5xl font-semibold tabular-nums tracking-tight">
          {plans.yearlyPerMonthLabel}
        </span>
        <span className="text-sm text-muted-foreground">
          {t('landing.pricing.perMonth')}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        {t('landing.pricing.billedYearly', { price: plans.yearlyLabel })}
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
