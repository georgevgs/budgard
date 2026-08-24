import { useTranslation } from 'react-i18next';
import SectionShell from '@/components/landing/SectionShell';
import EyebrowLabel from '@/components/landing/EyebrowLabel';
import Reveal from '@/components/landing/Reveal';
import TileLabel from '@/components/bento/TileLabel';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';

type Tx = (key: string) => string;

// The one feature that demonstrates itself in a single frame: receipt on the
// left, the expense it becomes on the right.
const Scan = () => {
  const { t } = useTranslation();

  return (
    <SectionShell tone="default">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <Reveal>{renderCopy(t)}</Reveal>
        <Reveal delay={120}>
          <div className="max-w-md mx-auto lg:max-w-none">{renderDemo(t)}</div>
        </Reveal>
      </div>
    </SectionShell>
  );
};

export default Scan;

const renderCopy = (t: Tx) => (
  <div>
    <EyebrowLabel>{t('landing.scan.eyebrow')}</EyebrowLabel>
    <h2 className="type-heading mt-3 text-3xl leading-[1.08] sm:text-4xl md:text-5xl">
      {t('landing.scan.heading')}
    </h2>
    <p className="mt-5 text-base text-muted-foreground leading-relaxed max-w-md">
      {t('landing.scan.body')}
    </p>
    <ul className="mt-6 space-y-2.5 text-sm text-foreground/80">
      {[1, 2, 3].map((n) => renderPoint(t(`landing.scan.point${n}`)))}
    </ul>
  </div>
);

const renderPoint = (text: string) => (
  <li key={text} className="flex items-start gap-2.5">
    <span className="mt-2 w-1 h-1 rounded-full bg-primary shrink-0" />
    <span>{text}</span>
  </li>
);

// Receipt on the left, the expense it becomes on the right. The whole pitch is
// that one turns into the other, so showing both at once says it faster than
// any sentence.
const renderDemo = (t: Tx) => (
  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
    {renderReceipt(t)}
    <ArrowRight aria-hidden="true" className="h-5 w-5 text-foreground/60" />
    {renderResult(t)}
  </div>
);

const renderReceipt = (t: Tx) => (
  <div className="surface-card p-4 lift">
    <TileLabel>{t('landing.scan.receiptLabel')}</TileLabel>
    <div className="mt-3 space-y-1.5">
      <div className="h-1.5 w-3/4 rounded-full bg-muted" />
      <div className="h-1.5 w-1/2 rounded-full bg-muted" />
      <div className="h-1.5 w-2/3 rounded-full bg-muted" />
    </div>
    <div className="mt-4 border-t border-dashed border-border pt-3 flex items-baseline justify-between">
      <span className="text-[11px] font-medium">
        {t('landing.scan.receiptTotal')}
      </span>
      <span className="type-figure-sm text-sm">€24.80</span>
    </div>
  </div>
);

const renderResult = (t: Tx) => (
  <div className="surface-card p-4 lift">
    <TileLabel>{t('landing.scan.resultLabel')}</TileLabel>
    <p className="type-heading mt-2 text-sm">{t('landing.scan.merchant')}</p>
    <p className="text-[11px] text-muted-foreground">
      {t('landing.scan.resultDate')}
    </p>
    <p className="type-figure mt-3 text-[22px]">€24.80</p>
    <span className="mt-3 inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary-ink">
      {t('landing.scan.category')}
    </span>
  </div>
);
