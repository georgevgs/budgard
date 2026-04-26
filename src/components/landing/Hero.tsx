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
  const { isIosSafari, isAndroidInstallable, isStandalone, triggerAndroidInstall } =
    useInstallPrompt();
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
          <Reveal delay={120}>{renderSubtitle(t)}</Reveal>
          <Reveal delay={220}>
            {renderCtas(t, onGetStarted, showInstall, handleInstall)}
          </Reveal>
          <Reveal delay={320}>{renderTrustLine(t)}</Reveal>
        </div>
        <Reveal delay={420} className="mt-16 sm:mt-20">
          {renderHeroShot(t)}
        </Reveal>
      </div>
      <IosInstallModal open={showIosModal} onOpenChange={setShowIosModal} />
    </div>
  );
};

export default Hero;

const renderBackdrop = () => (
  <div
    aria-hidden
    className="absolute inset-0 pointer-events-none"
    style={{
      backgroundImage:
        'radial-gradient(1000px 500px at 50% -10%, hsl(var(--primary) / 0.10), transparent 70%)',
    }}
  />
);

const renderHeading = (t: Tx) => (
  <h1 className="text-[44px] sm:text-6xl md:text-7xl font-semibold tracking-[-0.03em] leading-[1.02] text-foreground">
    {t('landing.hero.headingLine1')}
    <br />
    <span className="text-muted-foreground">
      {t('landing.hero.headingLine2')}
    </span>
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
      className="group rounded-full px-7 h-12 text-[15px] shadow-lg shadow-primary/25 w-full sm:w-auto"
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
      <div className="px-5 pt-5 pb-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('navigation.expenses')}
        </p>
        <p className="text-[34px] font-semibold tabular-nums tracking-tight mt-1">
          €1,058.49
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('landing.hero.previewMonthLabel')}
        </p>
      </div>
      <div className="px-3 pb-4 space-y-1">
        {renderRow('Apartment rent', t('landing.hero.cat.housing'), '€800.00', 'hsl(24 90% 55%)')}
        {renderRow('Weekly groceries', t('landing.hero.cat.food'), '€78.40', 'hsl(142 70% 45%)')}
        {renderRow('Netflix', t('landing.hero.cat.subs'), '€12.99', 'hsl(220 70% 55%)')}
        {renderRow('Metro pass', t('landing.hero.cat.transport'), '€30.00', 'hsl(280 60% 60%)')}
      </div>
    </DeviceFrame>
  </div>
);

const renderRow = (label: string, sub: string, amount: string, color: string) => (
  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
    <span
      className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
      style={{ backgroundColor: `${color}1f` }}
    >
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-[13px] font-medium truncate">{label}</span>
      <span className="block text-[11px] text-muted-foreground">{sub}</span>
    </span>
    <span className="text-[13px] font-semibold tabular-nums">{amount}</span>
  </div>
);
