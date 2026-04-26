import { useTranslation } from 'react-i18next';
import SectionShell from '@/components/landing/SectionShell';
import EyebrowLabel from '@/components/landing/EyebrowLabel';
import DeviceFrame from '@/components/landing/DeviceFrame';
import Reveal from '@/components/landing/Reveal';

type Tx = (key: string) => string;

const Analytics = () => {
  const { t } = useTranslation();

  return (
    <SectionShell id="features" tone="default">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <Reveal>{renderCopy(t)}</Reveal>
        <Reveal delay={120}>
          <div className="max-w-md mx-auto lg:max-w-none">{renderChart(t)}</div>
        </Reveal>
      </div>
    </SectionShell>
  );
};

export default Analytics;

const renderCopy = (t: Tx) => (
  <div>
    <EyebrowLabel>{t('landing.analytics.eyebrow')}</EyebrowLabel>
    <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
      {t('landing.analytics.heading')}
    </h2>
    <p className="mt-5 text-base text-muted-foreground leading-relaxed max-w-md">
      {t('landing.analytics.body')}
    </p>
  </div>
);

const renderChart = (t: Tx) => (
  <DeviceFrame>
    <div className="p-6">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {t('landing.analytics.cardLabel')}
      </p>
      <p className="text-[32px] font-semibold tabular-nums tracking-tight mt-1">
        €8,868
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {t('landing.analytics.cardSub')}
      </p>
      {renderSvgChart()}
      {renderLegend(t)}
    </div>
  </DeviceFrame>
);

const renderSvgChart = () => {
  const data = [320, 580, 420, 750, 680, 890, 640, 820, 950, 780, 1058, 712];
  const max = Math.max(...data);
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 320},${100 - (v / max) * 88}`)
    .join(' ');

  return (
    <svg viewBox="0 0 320 110" className="w-full mt-5" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,110 ${points} 320,110`} fill="url(#chartFill)" />
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const renderLegend = (t: Tx) => (
  <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
    <span>{t('landing.analytics.legendStart')}</span>
    <span>{t('landing.analytics.legendEnd')}</span>
  </div>
);
