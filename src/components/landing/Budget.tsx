import { useTranslation } from 'react-i18next';
import SectionShell from '@/components/landing/SectionShell';
import EyebrowLabel from '@/components/landing/EyebrowLabel';
import DeviceFrame from '@/components/landing/DeviceFrame';
import Reveal from '@/components/landing/Reveal';

type Tx = (key: string) => string;

type CategoryRow = { name: string; percent: number; amount: string; color: string };

const Budget = () => {
  const { t } = useTranslation();

  return (
    <SectionShell tone="muted">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <Reveal className="lg:order-2">{renderCopy(t)}</Reveal>
        <Reveal delay={120} className="lg:order-1">
          <div className="max-w-md mx-auto lg:max-w-none">{renderCard(t)}</div>
        </Reveal>
      </div>
    </SectionShell>
  );
};

export default Budget;

const renderCopy = (t: Tx) => (
  <div>
    <EyebrowLabel>{t('landing.budget.eyebrow')}</EyebrowLabel>
    <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
      {t('landing.budget.heading')}
    </h2>
    <p className="mt-5 text-base text-muted-foreground leading-relaxed max-w-md">
      {t('landing.budget.body')}
    </p>
  </div>
);

const renderCard = (t: Tx) => (
  <DeviceFrame>
    <div className="p-6">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {t('landing.budget.cardLabel')}
      </p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-[32px] font-semibold tabular-nums tracking-tight">
          €1,058
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">/ €2,000</p>
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: '53%' }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>{t('landing.budget.spent')}</span>
        <span className="tabular-nums">53%</span>
      </div>
      <div className="mt-6 space-y-3">{rows(t).map(renderRow)}</div>
    </div>
  </DeviceFrame>
);

const rows = (t: Tx): CategoryRow[] => [
  { name: t('landing.budget.cats.housing'), percent: 80, amount: '€800', color: 'hsl(24 90% 55%)' },
  { name: t('landing.budget.cats.food'), percent: 39, amount: '€156', color: 'hsl(142 70% 45%)' },
  { name: t('landing.budget.cats.transport'), percent: 50, amount: '€100', color: 'hsl(280 60% 60%)' },
  { name: t('landing.budget.cats.subs'), percent: 13, amount: '€26', color: 'hsl(220 70% 55%)' },
];

const renderRow = (row: CategoryRow) => (
  <div key={row.name}>
    <div className="flex items-center justify-between text-[12px]">
      <span className="font-medium">{row.name}</span>
      <span className="tabular-nums text-muted-foreground">{row.amount}</span>
    </div>
    <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${row.percent}%`, backgroundColor: row.color }}
      />
    </div>
  </div>
);
