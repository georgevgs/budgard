import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Download from 'lucide-react/dist/esm/icons/download';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import { useTranslation } from 'react-i18next';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { IosInstallModal } from '@/components/landing/IosInstallModal';

type HeroProps = {
  onGetStarted: () => void;
};

const Hero = ({ onGetStarted }: HeroProps) => {
  const { t } = useTranslation();
  const { isIosSafari, isAndroidInstallable, isStandalone, triggerAndroidInstall } =
    useInstallPrompt();
  const [showIosModal, setShowIosModal] = useState(false);

  const showInstallButton = !isStandalone && (isIosSafari || isAndroidInstallable);

  const handleInstallClick = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (isIosSafari) {
      setShowIosModal(true);
    } else {
      void triggerAndroidInstall();
    }
  };

  return (
    <div className="relative overflow-hidden pb-24">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)] -z-10" />

      <div className="relative px-4 pt-4 mx-auto max-w-7xl">
        <div className="text-center space-y-8 animate-fade-up">
          {/* Floating Icon Badges */}
          <div className="flex justify-center gap-4 mb-8">
            <div className="animate-float delay-100 flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div className="animate-float delay-200 flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 border border-primary/25 shadow-xl">
              <TrendingDown className="h-8 w-8 text-primary" />
            </div>
            <div className="animate-float delay-300 flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t('landing.hero.heading1')}
            <span className="block mt-1 bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
              {t('landing.hero.heading2')}
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground">
            {t('landing.hero.subtitle')}
          </p>

          <div className="flex flex-col gap-4 justify-center items-center pt-4 w-full max-w-[280px] mx-auto">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="group w-full animate-fade-up delay-200"
            >
              {t('landing.hero.getStarted')}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            {showInstallButton && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleInstallClick}
                className="group w-full animate-fade-up delay-200"
              >
                <Download className="mr-2 h-4 w-4" />
                {t('landing.hero.addToHomeScreen')}
              </Button>
            )}
          </div>
          <IosInstallModal open={showIosModal} onOpenChange={setShowIosModal} />

          <p className="text-xs text-muted-foreground animate-fade-up delay-300">
            {t('landing.hero.freeToUse')}
          </p>

          {/* App Preview */}
          <div
            className="mt-4 mx-auto max-w-[300px] rounded-2xl border bg-card/90 backdrop-blur-sm shadow-2xl overflow-hidden animate-fade-up text-left"
            style={{ animationDelay: '400ms' }}
          >
            {renderPreviewHeader()}
            <div className="p-2">
              {renderPreviewExpense('Rent', 'Housing', '€800.00', '#6366f1')}
              {renderPreviewExpense('Groceries', 'Food', '€245.50', '#22c55e')}
              {renderPreviewExpense(
                'Netflix',
                'Subscriptions',
                '€12.99',
                '#f97316',
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const renderPreviewHeader = () => (
  <div className="px-4 pt-4 pb-3 border-b bg-muted/20">
    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
      February 2026
    </p>
    <p className="text-xl font-bold tabular-nums mt-0.5">€1,058.49</p>
    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full bg-primary" style={{ width: '53%' }} />
    </div>
    <p className="text-xs text-muted-foreground mt-1">53% of €2,000 budget</p>
  </div>
);

const renderPreviewExpense = (
  description: string,
  category: string,
  amount: string,
  color: string,
) => (
  <div
    key={description}
    className="flex items-center gap-3 px-2 py-2 rounded-lg"
  >
    <div
      className="w-1 h-8 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium truncate">{description}</p>
      <p className="text-xs text-muted-foreground">{category}</p>
    </div>
    <p className="text-xs font-semibold tabular-nums">{amount}</p>
  </div>
);

export default Hero;
