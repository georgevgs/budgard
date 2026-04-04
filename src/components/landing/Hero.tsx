import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Download from 'lucide-react/dist/esm/icons/download';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
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
    <div className="relative overflow-hidden pt-8 pb-24">
      {renderBackground()}

      <div className="relative px-4 mx-auto max-w-4xl">
        <div className="text-center space-y-6 animate-fade-up">
          {renderBadgePill(t)}
          {renderHeading(t)}
          {renderSubtitle(t)}
          {renderCTAs(onGetStarted, showInstallButton, handleInstallClick, t)}
          {renderTrustRow(t)}
          <HeroPreview />
        </div>
      </div>

      <IosInstallModal open={showIosModal} onOpenChange={setShowIosModal} />
    </div>
  );
};

export default Hero;

// ─── Hero Preview Carousel ────────────────────────────────────────────────────

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
      className="mt-6 mx-auto max-w-sm animate-fade-up"
      style={{ animationDelay: '400ms' }}
    >
      {/* Device frame */}
      <div className="relative">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-primary/20 to-primary/5 blur-md" />
        <div className="relative rounded-2xl border border-border/60 bg-card/95 backdrop-blur-sm shadow-lg shadow-black/10 overflow-hidden text-left">
          {renderMockStatusBar()}
          <div className="relative h-[230px]">
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
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-0 mt-4">
        {Array.from({ length: SLIDE_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveSlide(i)}
            aria-label={`Slide ${i + 1}`}
            className="group p-2 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <div
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                activeSlide === i
                  ? 'w-5 bg-primary'
                  : 'w-1.5 bg-muted-foreground/30 group-hover:bg-muted-foreground/50',
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Render helpers ───────────────────────────────────────────────────────────

const renderBackground = () => (
  <>
    <div
      className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse at center, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }}
    />
    <div
      className="absolute top-40 -left-40 w-72 h-72 rounded-full pointer-events-none"
      style={{
        background:
          'radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)',
        filter: 'blur(60px)',
      }}
    />
    <div
      className="absolute top-60 -right-40 w-80 h-80 rounded-full pointer-events-none"
      style={{
        background:
          'radial-gradient(circle, hsl(var(--primary) / 0.06) 0%, transparent 70%)',
        filter: 'blur(80px)',
      }}
    />
  </>
);

type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

const renderBadgePill = (t: TranslateFn) => (
  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/10 text-xs font-medium text-primary animate-fade-up">
    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
    {t('landing.hero.freeToUse')}
  </div>
);

const renderHeading = (t: TranslateFn) => (
  <h1
    className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl"
    style={{ lineHeight: '1.08' }}
  >
    {t('landing.hero.heading1')}
    <span className="block mt-2 bg-gradient-to-r from-primary via-primary/85 to-primary/50 bg-clip-text text-transparent">
      {t('landing.hero.heading2')}
    </span>
  </h1>
);

const renderSubtitle = (t: TranslateFn) => (
  <p className="max-w-xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
    {t('landing.hero.subtitle')}
  </p>
);

const renderInstallButton = (
  showInstallButton: boolean,
  handleInstallClick: () => void,
  t: TranslateFn,
) => {
  if (!showInstallButton) return null;

  return (
    <Button
      size="lg"
      variant="outline"
      onClick={handleInstallClick}
      className="group w-full sm:w-auto"
    >
      <Download className="mr-2 h-4 w-4" />
      {t('landing.hero.addToHomeScreen')}
    </Button>
  );
};

const renderCTAs = (
  onGetStarted: () => void,
  showInstallButton: boolean,
  handleInstallClick: () => void,
  t: TranslateFn,
) => (
  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
    <Button
      size="lg"
      onClick={onGetStarted}
      className="group w-full sm:w-auto min-w-[160px] shadow-lg shadow-primary/20"
    >
      {t('landing.hero.getStarted')}
      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
    </Button>
    {renderInstallButton(showInstallButton, handleInstallClick, t)}
  </div>
);

const renderTrustRow = (t: TranslateFn) => (
  <div className="flex items-center justify-center gap-5 pt-1">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Lock className="h-3 w-3" />
      <span>{t('landing.hero.trustedPrivate')}</span>
    </div>
    <div className="w-px h-3 bg-border/60" />
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Zap className="h-3 w-3" />
      <span>{t('landing.hero.freeToUse').split('·')[0].trim()}</span>
    </div>
    <div className="w-px h-3 bg-border/60" />
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Sparkles className="h-3 w-3" />
      <span>{t('landing.hero.trustedFree')}</span>
    </div>
  </div>
);

const renderMockStatusBar = () => (
  <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/20">
    <span className="text-[10px] font-medium text-muted-foreground">
      budgard
    </span>
    <div className="flex items-center gap-1">
      <div className="w-3 h-1.5 rounded-sm bg-muted-foreground/30" />
      <div className="w-3 h-1.5 rounded-sm bg-muted-foreground/20" />
    </div>
  </div>
);

// ─── Slide render functions ───────────────────────────────────────────────────

const renderExpenseSlide = (t: TranslateFn) => (
  <div>
    <div className="px-4 pt-4 pb-3 border-b border-border/40 bg-muted/10">
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
        {t('navigation.expenses')}
      </p>
      <p className="text-2xl font-bold tabular-nums mt-0.5">€1,058.49</p>
    </div>
    <div className="p-2 space-y-1">
      {renderPreviewExpense('Rent', 'Housing', '€800.00', '#f97316')}
      {renderPreviewExpense('Groceries', 'Food', '€245.50', '#22c55e')}
      {renderPreviewExpense('Netflix', 'Subscriptions', '€12.99', '#3b82f6')}
    </div>
  </div>
);

const renderBudgetSlide = (t: TranslateFn) => (
  <div className="p-4 space-y-4">
    <div>
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
        {t('budget.monthlyBudget')}
      </p>
      <p className="text-2xl font-bold tabular-nums mt-0.5">€2,000.00</p>
    </div>
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {t('landing.hero.previewBudget', { percent: 53, amount: '€2,000' })}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-1000"
          style={{ width: '53%' }}
        />
      </div>
    </div>
    <div className="space-y-2">
      {renderBudgetCategory('Housing', 40, '#f97316')}
      {renderBudgetCategory('Food', 23, '#22c55e')}
      {renderBudgetCategory('Subscriptions', 12, '#3b82f6')}
      {renderBudgetCategory('Transport', 15, '#8b5cf6')}
      {renderBudgetCategory('Other', 10, '#ec4899')}
    </div>
  </div>
);

const renderAnalyticsSlide = () => {
  const sparkData = [320, 580, 420, 750, 680, 890, 640, 820, 950, 780, 1058, 0];
  const max = Math.max(...sparkData);
  const points = sparkData
    .map((val, i) => {
      const x = (i / (sparkData.length - 1)) * 280;
      const y = 80 - (val / max) * 70;

      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="p-4">
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
        Monthly Trends
      </p>
      <p className="text-2xl font-bold tabular-nums mt-0.5">€8,868</p>
      <p className="text-xs text-muted-foreground mt-0.5">12-month total</p>
      <svg
        viewBox="0 0 280 90"
        className="w-full mt-4"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="heroSparkGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="hsl(var(--primary))"
              stopOpacity="0.4"
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--primary))"
              stopOpacity="0.03"
            />
          </linearGradient>
        </defs>
        <polygon
          points={`0,90 ${points} 280,90`}
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
    className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/30 transition-colors"
  >
    <div
      className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center"
      style={{ backgroundColor: `${color}18` }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold truncate">{description}</p>
      <p className="text-[10px] text-muted-foreground">{category}</p>
    </div>
    <p className="text-xs font-bold tabular-nums">{amount}</p>
  </div>
);

const renderBudgetCategory = (name: string, percent: number, color: string) => (
  <div key={name} className="flex items-center gap-2">
    <div
      className="w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
    <span className="text-xs flex-1 truncate">{name}</span>
    <span className="text-xs font-medium tabular-nums text-muted-foreground">
      {percent}%
    </span>
  </div>
);
