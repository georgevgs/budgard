import { useTranslation } from 'react-i18next';
import SectionShell from '@/components/landing/SectionShell';
import EyebrowLabel from '@/components/landing/EyebrowLabel';
import DeviceFrame from '@/components/landing/DeviceFrame';
import Reveal from '@/components/landing/Reveal';

type Tx = (key: string) => string;
type Row = { key: string; amount: string; isIncome: boolean };

// Covers the half of the app the page used to be silent about: money coming in,
// what it adds up to across accounts, and the goals it feeds.
const MoneyFlow = () => {
  const { t } = useTranslation();

  return (
    <SectionShell tone="default">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <Reveal className="lg:order-2">{renderCopy(t)}</Reveal>
        <Reveal delay={120} className="lg:order-1">
          <div className="max-w-md mx-auto lg:max-w-none">{renderCard(t)}</div>
        </Reveal>
      </div>
    </SectionShell>
  );
};

export default MoneyFlow;

const renderCopy = (t: Tx) => (
  <div>
    <EyebrowLabel>{t('landing.flow.eyebrow')}</EyebrowLabel>
    <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
      {t('landing.flow.heading')}
    </h2>
    <p className="mt-5 text-base text-muted-foreground leading-relaxed max-w-md">
      {t('landing.flow.body')}
    </p>
    <ul className="mt-6 space-y-2.5 text-sm text-foreground/80">
      {[1, 2, 3].map((n) => renderPoint(t(`landing.flow.point${n}`)))}
    </ul>
  </div>
);

const renderPoint = (text: string) => (
  <li key={text} className="flex items-start gap-2.5">
    <span className="mt-2 w-1 h-1 rounded-full bg-primary shrink-0" />
    <span>{text}</span>
  </li>
);

const renderCard = (t: Tx) => (
  <DeviceFrame>
    <div className="p-6">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {t('landing.flow.cardLabel')}
      </p>
      <p className="mt-1 text-[32px] font-semibold tabular-nums tracking-tight">
        €18,420
      </p>
      <p className="text-[11px] text-income">{t('landing.flow.cardDelta')}</p>
      <div className="mt-6 space-y-3">
        {rows().map((row) => renderRow(row, t))}
      </div>
      <div className="mt-6 border-t border-border/60 pt-4">
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="font-medium">{t('landing.flow.goal')}</span>
          <span className="tabular-nums text-muted-foreground">
            €1,240 / €2,000
          </span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: '62%' }}
          />
        </div>
      </div>
    </div>
  </DeviceFrame>
);

const rows = (): Row[] => [
  { key: 'salary', amount: '€2,400', isIncome: true },
  { key: 'freelance', amount: '€380', isIncome: true },
  { key: 'spending', amount: '€1,058', isIncome: false },
];

const renderRow = (row: Row, t: Tx) => (
  <div key={row.key} className="flex items-center justify-between text-[12px]">
    <span className="font-medium">{t(`landing.flow.rows.${row.key}`)}</span>
    <span className={amountClass(row.isIncome)}>
      {sign(row.isIncome)}
      {row.amount}
    </span>
  </div>
);

const amountClass = (isIncome: boolean): string => {
  if (isIncome) {
    return 'tabular-nums font-semibold text-income';
  }

  return 'tabular-nums font-semibold';
};

const sign = (isIncome: boolean): string => {
  if (isIncome) {
    return '+';
  }

  return '−';
};
