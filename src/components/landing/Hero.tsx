import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Download from 'lucide-react/dist/esm/icons/download';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { IosInstallModal } from '@/components/landing/IosInstallModal';
import DeviceFrame from '@/components/landing/DeviceFrame';
import Reveal from '@/components/landing/Reveal';

type Props = {
  onGetStarted: () => void;
};

type Tx = (key: string, opts?: Record<string, unknown>) => string;

const Hero = ({ onGetStarted }: Props) => {
  const { t } = useTranslation();
  const {
    isIosSafari,
    isAndroidInstallable,
    isStandalone,
    triggerAndroidInstall,
  } = useInstallPrompt();
  const [showIosModal, setShowIosModal] = useState(false);

  const showInstall = !isStandalone && (isIosSafari || isAndroidInstallable);

  const handleInstall = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (isIosSafari) {
      setShowIosModal(true);

      return;
    }
    void triggerAndroidInstall();
  };

  return (
    <div id="top" className="relative overflow-hidden bg-background">
      {renderBackdrop()}
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-20 sm:pt-28 pb-16 sm:pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>{renderHeading(t)}</Reveal>
          <Reveal delay={80}>{renderSubtitle(t)}</Reveal>
          <Reveal delay={160}>
            {renderCtas(t, onGetStarted, showInstall, handleInstall)}
          </Reveal>
          <Reveal delay={240}>{renderTrustLine(t)}</Reveal>
        </div>
        <Reveal delay={320} className="mt-16 sm:mt-20">
          {renderHeroShot(t)}
        </Reveal>
      </div>
      <IosInstallModal open={showIosModal} onOpenChange={setShowIosModal} />
    </div>
  );
};

export default Hero;

// The `aurora` utility carries the whole wash (see index.css) so the hero and
// the app's lit surfaces cannot drift apart, and so the landing page turns
// with the accent the way every other screen does.
const renderBackdrop = () => (
  <div aria-hidden className="aurora absolute inset-0 pointer-events-none" />
);

const renderHeading = (t: Tx) => (
  <h1 className="font-display text-[44px] sm:text-6xl md:text-7xl font-semibold tracking-[-0.035em] leading-[1.02] text-foreground">
    {t('landing.hero.headingLine1')}
    <br />
    <span className="neon-ink">{t('landing.hero.headingLine2')}</span>
  </h1>
);

const renderSubtitle = (t: Tx) => (
  <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
    {t('landing.hero.subtitle')}
  </p>
);

const renderCtas = (
  t: Tx,
  onGetStarted: () => void,
  showInstall: boolean,
  handleInstall: () => void,
) => (
  <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center items-center">
    <Button
      size="lg"
      onClick={onGetStarted}
      className="group rounded-full px-7 h-12 text-[15px] glow w-full sm:w-auto"
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
  if (!showInstall) return null;

  return (
    <Button
      size="lg"
      variant="outline"
      onClick={handleInstall}
      className="rounded-full px-6 h-12 w-full sm:w-auto"
    >
      <Download className="mr-1 h-4 w-4" />
      {t('landing.hero.installCta')}
    </Button>
  );
};

const renderTrustLine = (t: Tx) => (
  <p className="mt-6 text-xs text-muted-foreground/80 tracking-wide">
    {t('landing.hero.trust')}
  </p>
);

const renderHeroShot = (t: Tx) => (
  <div className="max-w-md mx-auto">
    <DeviceFrame glow>
      <div className="p-3">
        {/* Built from the same tone classes the real hero uses, so the shot
            can never drift from the product — including in dark mode. */}
        <div className="today-hero today-hero-comfortable rounded-[1.4rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold opacity-65">
              {t('today.greeting.morning')}
            </p>
            <span className="rounded-full bg-white/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
              {t('today.chip.comfortable')}
            </span>
          </div>
          <p className="mt-2 max-w-[16rem] font-display text-xl font-semibold leading-tight tracking-[-0.025em]">
            {t('today.status.comfortable')}
          </p>
          <p className="mt-5 font-display text-[2.35rem] font-bold leading-none tracking-[-0.045em] tabular-nums">
            {t('landing.hero.previewSafeAmount')}
          </p>
          <p className="mt-1 text-xs opacity-65">{t('today.leftAfterBills')}</p>
          {renderPreviewPath()}
        </div>
        <div className="space-y-1 px-2 py-3">
          {renderPreviewSummary(
            t('today.upcoming.title'),
            t('landing.hero.previewUpcoming'),
          )}
          {renderPreviewSummary(
            t('today.insights.title'),
            t('landing.hero.previewInsight'),
          )}
        </div>
      </div>
    </DeviceFrame>
  </div>
);

const renderPreviewPath = () => (
  <svg viewBox="0 0 280 78" className="mt-4 h-20 w-full" aria-hidden="true">
    <path d="M 4 67 L 276 8 L 276 28 L 4 76 Z" className="fill-white/35" />
    <path
      d="M 4 72 L 276 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeDasharray="4 6"
      className="opacity-25"
    />
    <path
      d="M 4 72 C 38 68, 52 62, 82 60 S 124 49, 151 48 S 181 39, 207 38"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <circle cx="207" cy="38" r="5" className="fill-primary" />
  </svg>
);

const renderPreviewSummary = (label: string, value: string) => (
  <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-2.5">
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-medium">{value}</p>
    </div>
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
      aria-hidden="true"
    />
  </div>
);
