import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Download from 'lucide-react/dist/esm/icons/download';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { IosInstallModal } from '@/components/landing/IosInstallModal';

type HeroProps = {
  onGetStarted: () => void;
};

const Hero = ({ onGetStarted }: HeroProps) => {
  const { t } = useTranslation();
  const {
    isIosSafari,
    isAndroidInstallable,
    isStandalone,
    triggerAndroidInstall,
  } = useInstallPrompt();
  const [showIosModal, setShowIosModal] = useState(false);

  const showInstallButton =
    !isStandalone && (isIosSafari || isAndroidInstallable);

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

          {/* App Preview Carousel */}
          <HeroPreview />
        </div>
      </div>
    </div>
  );
};

export default Hero;

// ─── Hero Preview Carousel ───────────────────────────────────────────────────

const SLIDE_COUNT = 3;
const SLIDE_INTERVAL_MS = 4000;

const HeroPreview = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const { t } = useTranslation();

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const nextSlide = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % SLIDE_COUNT);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(nextSlide, SLIDE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [nextSlide, prefersReducedMotion]);

  return (
    <div
      className="mt-4 mx-auto max-w-[300px] animate-fade-up"
      style={{ animationDelay: '400ms' }}
    >
      <div className="rounded-2xl border bg-card/90 backdrop-blur-sm shadow-2xl overflow-hidden text-left">
        <div className="relative h-[210px]">
          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-300',
              activeSlide === 0
                ? 'opacity-100'
                : 'opacity-0 pointer-events-none',
            )}
          >
            {renderExpenseSlide(t)}
          </div>
          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-300',
              activeSlide === 1
                ? 'opacity-100'
                : 'opacity-0 pointer-events-none',
            )}
          >
            {renderBudgetSlide(t)}
          </div>
          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-300',
              activeSlide === 2
                ? 'opacity-100'
                : 'opacity-0 pointer-events-none',
            )}
          >
            {renderAnalyticsSlide()}
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {Array.from({ length: SLIDE_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveSlide(i)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              activeSlide === i
                ? 'w-4 bg-primary'
                : 'w-1.5 bg-muted-foreground/30',
            )}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Slide render functions ──────────────────────────────────────────────────

type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

const renderExpenseSlide = (t: TranslateFn) => (
  <div>
    <div className="px-4 pt-4 pb-3 border-b bg-muted/20">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        {t('navigation.expenses')}
      </p>
      <p className="text-xl font-bold tabular-nums mt-0.5">€1,058.49</p>
    </div>
    <div className="p-2">
      {renderPreviewExpense('Rent', 'Housing', '€800.00', '#6366f1')}
      {renderPreviewExpense('Groceries', 'Food', '€245.50', '#22c55e')}
      {renderPreviewExpense('Netflix', 'Subscriptions', '€12.99', '#f97316')}
    </div>
  </div>
);

const renderBudgetSlide = (t: TranslateFn) => (
  <div className="p-4 space-y-4">
    <div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        {t('budget.monthlyBudget')}
      </p>
      <p className="text-xl font-bold tabular-nums mt-0.5">€2,000.00</p>
    </div>
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {t('landing.hero.previewBudget', { percent: 53, amount: '€2,000' })}
        </span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-1000"
          style={{ width: '53%' }}
        />
      </div>
    </div>
    <div className="space-y-1.5">
      {renderBudgetCategory('Housing', 40, '#6366f1')}
      {renderBudgetCategory('Food', 23, '#22c55e')}
      {renderBudgetCategory('Subscriptions', 12, '#f97316')}
      {renderBudgetCategory('Transport', 15, '#3b82f6')}
      {renderBudgetCategory('Other', 10, '#8b5cf6')}
    </div>
  </div>
);

const renderAnalyticsSlide = () => {
  const sparkData = [320, 580, 420, 750, 680, 890, 640, 820, 950, 780, 1058, 0];
  const max = Math.max(...sparkData);
  const points = sparkData
    .map((val, i) => {
      const x = (i / (sparkData.length - 1)) * 260;
      const y = 80 - (val / max) * 70;

      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="p-4">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        Monthly Trends
      </p>
      <p className="text-xl font-bold tabular-nums mt-0.5">€8,868</p>
      <p className="text-xs text-muted-foreground mt-0.5">12-month total</p>
      <svg
        viewBox="0 0 260 90"
        className="w-full mt-3"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="heroSparkGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="hsl(var(--primary))"
              stopOpacity="0.5"
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--primary))"
              stopOpacity="0.05"
            />
          </linearGradient>
        </defs>
        <polygon
          points={`0,90 ${points} 260,90`}
          fill="url(#heroSparkGradient)"
        />
        <polyline
          points={points}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

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

const renderBudgetCategory = (name: string, percent: number, color: string) => (
  <div key={name} className="flex items-center gap-2">
    <div
      className="w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
    <span className="text-xs flex-1 truncate">{name}</span>
    <span className="text-xs text-muted-foreground tabular-nums">
      {percent}%
    </span>
  </div>
);
