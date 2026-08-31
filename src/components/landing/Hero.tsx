import { useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import CalendarRange from 'lucide-react/dist/esm/icons/calendar-range';
import ChartSpline from 'lucide-react/dist/esm/icons/chart-spline';
import Download from 'lucide-react/dist/esm/icons/download';
import House from 'lucide-react/dist/esm/icons/house';
import List from 'lucide-react/dist/esm/icons/list';
import BentoGrid from '@/components/bento/BentoGrid';
import BentoTile from '@/components/bento/BentoTile';
import TileLabel from '@/components/bento/TileLabel';
import { IosInstallModal } from '@/components/landing/IosInstallModal';
import Reveal from '@/components/landing/Reveal';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

type Props = {
  onGetStarted: () => void;
};

type Tx = (key: string, opts?: Record<string, unknown>) => string;
type PreviewTab = {
  key: string;
  Icon: ComponentType<{ className?: string }>;
};

const Hero = ({ onGetStarted }: Props) => {
  const { t } = useTranslation();
  const install = useInstallPrompt();
  const [showIosModal, setShowIosModal] = useState(false);
  const showInstall =
    !install.isStandalone &&
    (install.isIosSafari || install.isAndroidInstallable);

  const handleInstall = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (install.isIosSafari) {
      setShowIosModal(true);

      return;
    }
    void install.triggerAndroidInstall();
  };

  return (
    <section id="top" className="overflow-hidden bg-background">
      <div className="landing-gutter mx-auto grid max-w-6xl items-center gap-14 pb-20 pt-16 sm:pb-28 sm:pt-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(27rem,1.1fr)] lg:gap-20">
        <div className="max-w-xl">
          <Reveal>{renderHeroCopy(t)}</Reveal>
          <Reveal delay={100}>
            {renderCtas(t, onGetStarted, showInstall, handleInstall)}
          </Reveal>
          <Reveal delay={180}>{renderTrustLine(t)}</Reveal>
        </div>
        <Reveal delay={180} className="mx-auto w-full max-w-[31rem]">
          {renderTodayPreview(t)}
        </Reveal>
      </div>
      <IosInstallModal open={showIosModal} onOpenChange={setShowIosModal} />
    </section>
  );
};

export default Hero;

// --- Helpers ---

const renderHeroCopy = (t: Tx) => (
  <div>
    <TileLabel className="text-primary-ink">
      {t('landing.hero.eyebrow')}
    </TileLabel>
    <h1 className="mt-5 type-slab text-[2.9rem] leading-[0.96] text-foreground sm:text-[4rem] lg:text-[4.5rem]">
      {t('landing.hero.headingLine1')}
      <br />
      <span className="text-primary-ink">{t('landing.hero.headingLine2')}</span>
    </h1>
    <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
      {t('landing.hero.subtitle')}
    </p>
  </div>
);

const renderCtas = (
  t: Tx,
  onGetStarted: () => void,
  showInstall: boolean,
  handleInstall: () => void,
) => (
  <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
    <Button
      size="lg"
      onClick={onGetStarted}
      className="group h-12 rounded-full px-7 text-[15px] lift"
    >
      {t('landing.hero.primaryCta')}
      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Button>
    {renderInstallButton(t, showInstall, handleInstall)}
  </div>
);

const renderInstallButton = (
  t: Tx,
  showInstall: boolean,
  handleInstall: () => void,
) => {
  if (!showInstall) {
    return null;
  }

  return (
    <Button
      size="lg"
      variant="outline"
      onClick={handleInstall}
      className="h-12 rounded-full px-6"
    >
      <Download className="mr-1 h-4 w-4" />
      {t('landing.hero.installCta')}
    </Button>
  );
};

const renderTrustLine = (t: Tx) => (
  <p className="mt-6 max-w-lg text-xs leading-relaxed text-muted-foreground">
    {t('landing.hero.trust')}
  </p>
);

const renderTodayPreview = (t: Tx) => (
  <div className="surface-card p-3 lift-soft sm:p-4">
    <div className="flex items-end justify-between gap-4 px-2 pb-4 pt-2">
      <div>
        <p className="type-title">{t('navigation.today')}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('landing.hero.previewDate')}
        </p>
      </div>
      <span className="rounded-full bg-muted px-3 py-2 text-xs font-semibold">
        {t('landing.hero.previewArrange')}
      </span>
    </div>
    <BentoGrid>
      {renderSafeToSpend(t)}
      {renderBudgetUsed(t)}
      {renderMonthPace(t)}
      {renderUpcoming(t)}
    </BentoGrid>
    {renderPreviewDock(t)}
  </div>
);

const renderSafeToSpend = (t: Tx) => (
  <BentoTile tone="slab" wide className="p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <TileLabel>{t('today.tiles.safeToSpend')}</TileLabel>
      <span className="tile-badge">{t('today.chip.comfortable')}</span>
    </div>
    <p className="mt-5 type-slab text-[3rem]">
      {t('landing.hero.previewSafeAmount')}
    </p>
    <div className="mt-3 flex items-end justify-between gap-4">
      <p className="max-w-48 text-xs font-semibold leading-relaxed">
        {t('today.leftAfterBills')}
      </p>
      <p className="shrink-0 text-xs font-semibold tabular-nums">
        {t('landing.hero.previewPerDay')}
      </p>
    </div>
  </BentoTile>
);

const renderBudgetUsed = (t: Tx) => (
  <BentoTile className="flex min-h-36 flex-col p-4">
    <TileLabel>{t('today.tiles.budgetUsed')}</TileLabel>
    <div className="relative mt-3 flex flex-1 items-center justify-center">
      <svg viewBox="0 0 84 84" className="h-20 w-20" aria-hidden="true">
        <circle
          cx="42"
          cy="42"
          r="34"
          fill="none"
          className="stroke-border/60"
          strokeWidth="9"
        />
        <circle
          cx="42"
          cy="42"
          r="34"
          fill="none"
          className="stroke-primary"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray="113 214"
          transform="rotate(-90 42 42)"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center type-figure-sm">
        53%
      </span>
    </div>
  </BentoTile>
);

const renderMonthPace = (t: Tx) => (
  <BentoTile className="flex min-h-36 flex-col justify-between p-4">
    <TileLabel>{t('today.tiles.monthPace')}</TileLabel>
    <div>
      <p className="type-figure">{t('landing.hero.previewPace')}</p>
      <p className="mt-2 text-[0.72rem] leading-snug text-muted-foreground">
        {t('landing.hero.previewPaceBody')}
      </p>
    </div>
  </BentoTile>
);

const renderUpcoming = (t: Tx) => (
  <BentoTile wide className="px-4.5 py-4">
    <div className="flex items-center justify-between gap-4">
      <TileLabel>{t('today.upcoming.title')}</TileLabel>
      <span className="text-xs font-medium text-primary-ink">
        {t('landing.hero.previewUpcoming')}
      </span>
    </div>
    <div className="mt-3 flex items-center gap-3 text-sm">
      <span className="text-[0.6875rem] font-semibold uppercase text-muted-foreground">
        {t('landing.hero.previewBillDay')}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">
        {t('landing.hero.previewBill')}
      </span>
      <span className="shrink-0 font-semibold tabular-nums">€48.40</span>
    </div>
  </BentoTile>
);

const renderPreviewDock = (t: Tx) => {
  const tabs: PreviewTab[] = [
    { key: 'today', Icon: House },
    { key: 'activity', Icon: List },
    { key: 'plan', Icon: CalendarRange },
    { key: 'trends', Icon: ChartSpline },
  ];

  return (
    <div className="glass-capsule mt-3 flex h-14 items-stretch p-1">
      {tabs.map((tab) => renderPreviewTab(tab, t))}
    </div>
  );
};

const renderPreviewTab = (tab: PreviewTab, t: Tx) => {
  const isActive = tab.key === 'today';
  let tone = 'text-muted-foreground';
  if (isActive) {
    tone = 'bg-primary/12 text-primary-ink';
  }

  return (
    <div
      key={tab.key}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full ${tone}`}
    >
      <tab.Icon className="h-4 w-4" />
      <span className="text-[10px] font-semibold leading-none">
        {t(`navigation.${tab.key}`)}
      </span>
    </div>
  );
};
