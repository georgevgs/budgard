import type { ComponentType, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import CalendarRange from 'lucide-react/dist/esm/icons/calendar-range';
import ChartSpline from 'lucide-react/dist/esm/icons/chart-spline';
import House from 'lucide-react/dist/esm/icons/house';
import List from 'lucide-react/dist/esm/icons/list';
import BentoGrid from '@/components/bento/BentoGrid';
import BentoTile from '@/components/bento/BentoTile';
import TileLabel from '@/components/bento/TileLabel';
import EyebrowLabel from '@/components/landing/EyebrowLabel';
import Reveal from '@/components/landing/Reveal';
import SectionShell from '@/components/landing/SectionShell';

type Tx = (key: string, opts?: Record<string, unknown>) => string;
type FeatureTab = {
  key: 'today' | 'activity' | 'plan' | 'trends';
  Icon: ComponentType<{ className?: string }>;
};

const FeatureTour = () => {
  const { t } = useTranslation();

  return (
    <SectionShell id="features" tone="muted">
      <Reveal>{renderHeader(t)}</Reveal>
      <div className="mx-auto mt-12 max-w-4xl">
        <BentoGrid>
          {featureTabs().map((tab, index) => (
            <Reveal key={tab.key} delay={80 + index * 70}>
              {renderFeatureTile(tab, t)}
            </Reveal>
          ))}
        </BentoGrid>
      </div>
      <Reveal delay={160}>{renderCapabilities(t)}</Reveal>
    </SectionShell>
  );
};

export default FeatureTour;

// --- Helpers ---

const featureTabs = (): FeatureTab[] => [
  { key: 'today', Icon: House },
  { key: 'activity', Icon: List },
  { key: 'plan', Icon: CalendarRange },
  { key: 'trends', Icon: ChartSpline },
];

const renderHeader = (t: Tx) => (
  <div className="mx-auto max-w-3xl text-center">
    <EyebrowLabel>{t('landing.features.eyebrow')}</EyebrowLabel>
    <h2 className="mt-3 type-heading text-3xl leading-[1.08] sm:text-4xl md:text-5xl">
      {t('landing.features.heading')}
    </h2>
    <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
      {t('landing.features.body')}
    </p>
  </div>
);

const renderFeatureTile = (tab: FeatureTab, t: Tx) => (
  <BentoTile className="flex h-full min-h-64 flex-col p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3">
      <TileLabel>{t(`navigation.${tab.key}`)}</TileLabel>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-primary-ink">
        <tab.Icon className="h-4 w-4" />
      </span>
    </div>
    <h3 className="mt-5 type-heading text-base">
      {t(`landing.features.${tab.key}.title`)}
    </h3>
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
      {t(`landing.features.${tab.key}.body`)}
    </p>
    <div className="mt-auto pt-6">{renderFeatureDemo(tab.key, t)}</div>
  </BentoTile>
);

const renderFeatureDemo = (key: FeatureTab['key'], t: Tx): ReactNode => {
  if (key === 'today') {
    return (
      <div>
        <p className="type-figure-lg text-primary-ink">
          {t('landing.features.today.figure')}
        </p>
        <p className="mt-1 text-[0.72rem] text-muted-foreground">
          {t('landing.features.today.caption')}
        </p>
      </div>
    );
  }
  if (key === 'activity') {
    return (
      <div className="space-y-2">
        {renderMoneyRow(t('landing.features.activity.income'), '+€2,400', true)}
        {renderMoneyRow(
          t('landing.features.activity.expense'),
          '−€24.80',
          false,
        )}
      </div>
    );
  }
  if (key === 'plan') {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="font-medium">
            {t('landing.features.plan.progress')}
          </span>
          <span className="font-semibold tabular-nums">€1,058 / €2,000</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[53%] rounded-full bg-primary" />
        </div>
      </div>
    );
  }

  return renderTrendDemo(t);
};

const renderMoneyRow = (label: string, amount: string, isIncome: boolean) => {
  let amountClass = 'font-semibold tabular-nums';
  if (isIncome) {
    amountClass = 'font-semibold tabular-nums text-income-ink';
  }

  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="min-w-0 truncate font-medium">{label}</span>
      <span className={amountClass}>{amount}</span>
    </div>
  );
};

const renderTrendDemo = (t: Tx) => (
  <div>
    <div className="flex h-12 items-end gap-1.5" aria-hidden="true">
      {[42, 68, 52, 84, 62, 92, 74].map((height, index) =>
        renderBar(height, index),
      )}
    </div>
    <p className="mt-2 text-[0.72rem] text-muted-foreground">
      {t('landing.features.trends.caption')}
    </p>
  </div>
);

const renderBar = (height: number, index: number) => {
  let tone = 'bg-foreground/25';
  if (index === 5) {
    tone = 'bg-primary';
  }

  return (
    <span
      key={height}
      className={`flex-1 rounded-sm ${tone}`}
      style={{ height: `${height}%` }}
    />
  );
};

const renderCapabilities = (t: Tx) => (
  <div className="surface-card-flush mx-auto mt-10 grid max-w-4xl divide-y divide-border/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
    {[1, 2, 3].map((index) => renderCapability(index, t))}
  </div>
);

const renderCapability = (index: number, t: Tx) => (
  <div key={index} className="p-5 sm:p-6">
    <TileLabel>{t(`landing.features.capability${index}.eyebrow`)}</TileLabel>
    <h3 className="mt-3 type-heading">
      {t(`landing.features.capability${index}.title`)}
    </h3>
    <ul className="mt-4 space-y-2.5">
      {[1, 2, 3].map((item) => (
        <li
          key={item}
          className="flex items-start gap-2.5 text-xs leading-relaxed"
        >
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
          <span className="text-foreground/80">
            {t(`landing.features.capability${index}.item${item}`)}
          </span>
        </li>
      ))}
    </ul>
  </div>
);
