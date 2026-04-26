import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import SectionShell from '@/components/landing/SectionShell';
import EyebrowLabel from '@/components/landing/EyebrowLabel';
import Reveal from '@/components/landing/Reveal';
import Check from 'lucide-react/dist/esm/icons/check';
import { cn } from '@/lib/utils';

type Props = {
  onGetStarted: () => void;
};

type Tx = (key: string, opts?: Record<string, unknown>) => string;
type Cycle = 'monthly' | 'yearly';

const PRICE_MONTHLY = '€1.99';
const PRICE_YEARLY = '€19.99';
const PRICE_YEARLY_PER_MONTH = '€1.66';

const Pricing = ({ onGetStarted }: Props) => {
  const { t } = useTranslation();
  const [cycle, setCycle] = useState<Cycle>('yearly');

  return (
    <SectionShell id="pricing" tone="default">
      <Reveal>{renderHeader(t)}</Reveal>
      <Reveal delay={100}>{renderToggle(t, cycle, setCycle)}</Reveal>
      <div className="mt-10 grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
        <Reveal delay={150}>{renderFreeCard(t, onGetStarted)}</Reveal>
        <Reveal delay={250}>{renderProCard(t, cycle, onGetStarted)}</Reveal>
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

const renderToggle = (t: Tx, cycle: Cycle, setCycle: (c: Cycle) => void) => (
  <div className="mt-8 flex justify-center">
    <div className="inline-flex p-1 rounded-full bg-muted border border-border/60">
      {renderToggleButton(t, 'monthly', cycle, setCycle)}
      {renderToggleButton(t, 'yearly', cycle, setCycle)}
    </div>
  </div>
);

const renderToggleButton = (
  t: Tx,
  value: Cycle,
  current: Cycle,
  setCycle: (c: Cycle) => void,
) => {
  const isActive = current === value;
  const labelKey =
    value === 'monthly' ? 'landing.pricing.monthly' : 'landing.pricing.yearly';

  return (
    <button
      type="button"
      onClick={() => setCycle(value)}
      className={cn(
        'px-4 h-9 rounded-full text-sm font-medium transition-colors',
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {t(labelKey)}
      {renderSaveBadge(t, value)}
    </button>
  );
};

const renderSaveBadge = (t: Tx, value: Cycle) => {
  if (value !== 'yearly') return null;

  return (
    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
      {t('landing.pricing.save')}
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
      {[1, 2, 3, 4, 5].map((n) =>
        renderFeature(t(`landing.pricing.free.feature${n}`)),
      )}
    </ul>
  </div>
);

const renderProCard = (t: Tx, cycle: Cycle, onGetStarted: () => void) => (
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
    {renderProPrice(t, cycle)}
    <Button onClick={onGetStarted} className="mt-6 rounded-full h-11">
      {t('landing.pricing.pro.cta')}
    </Button>
    <ul className="mt-8 space-y-3">
      {[1, 2, 3, 4, 5, 6, 7].map((n) =>
        renderFeature(t(`landing.pricing.pro.feature${n}`)),
      )}
    </ul>
  </div>
);

const renderProPrice = (t: Tx, cycle: Cycle) => {
  if (cycle === 'monthly') {
    return (
      <div className="mt-6 flex items-baseline gap-1.5">
        <span className="text-5xl font-semibold tabular-nums tracking-tight">
          {PRICE_MONTHLY}
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
          {PRICE_YEARLY_PER_MONTH}
        </span>
        <span className="text-sm text-muted-foreground">
          {t('landing.pricing.perMonth')}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        {t('landing.pricing.billedYearly', { price: PRICE_YEARLY })}
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
