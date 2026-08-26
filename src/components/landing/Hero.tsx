import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Download from 'lucide-react/dist/esm/icons/download';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { IosInstallModal } from '@/components/landing/IosInstallModal';
import DeviceFrame from '@/components/landing/DeviceFrame';
import Reveal from '@/components/landing/Reveal';
import TileLabel from '@/components/bento/TileLabel';

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
      <div className="landing-gutter relative mx-auto max-w-6xl pb-16 pt-20 sm:pb-24 sm:pt-28">
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

// The second line is the one accent on the page. It was a three-stop gradient
// running orange to red to blue, which reads as a rainbow rather than as a
// brand; a single ink says the same thing and is the same colour the CTA below
// it is filled with. `--primary-ink` is held to 4.5:1 on white by the design
// tests, so it stays a headline rather than a decoration.
const renderHeading = (t: Tx) => (
  <h1 className="type-slab text-[44px] leading-[1.02] sm:text-6xl md:text-7xl text-foreground">
    {t('landing.hero.headingLine1')}
    <br />
    <span className="text-primary-ink">{t('landing.hero.headingLine2')}</span>
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
      className="group rounded-full px-7 h-12 text-[15px] lift w-full sm:w-auto"
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
    <DeviceFrame>
      <div className="p-3">
        {/* The slab is the product's answer, not generic preview chrome. Using
            its real surface and type scale makes the first product image match
            the screen someone reaches after signing in. */}
        <div className="tile-slab lift rounded-[1.4rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <TileLabel>{t('today.tiles.safeToSpend')}</TileLabel>
            <span className="rounded-full bg-current/14 px-2.5 py-1.5 text-[0.6875rem] font-semibold uppercase leading-none tracking-[0.1em]">
              {t('today.chip.comfortable')}
            </span>
          </div>
          <p className="mt-4 type-slab text-[2.75rem]">
            {t('landing.hero.previewSafeAmount')}
          </p>
          <p className="mt-2 text-[0.8rem] font-semibold leading-tight opacity-92">
            {t('today.leftAfterBills')}
          </p>
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

const renderPreviewSummary = (label: string, value: string) => (
  <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-2.5">
    <div className="min-w-0">
      <TileLabel>{label}</TileLabel>
      <p className="mt-0.5 truncate text-xs font-medium">{value}</p>
    </div>
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
      aria-hidden="true"
    />
  </div>
);
