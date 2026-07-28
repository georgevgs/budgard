import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import { useDataConfig } from '@/contexts/DataContext';
import { useOnboardingActions } from '@/hooks/onboarding/useOnboardingActions';
import OnboardingWelcomeStep from '@/components/onboarding/OnboardingWelcomeStep';
import OnboardingBudgetStep from '@/components/onboarding/OnboardingBudgetStep';
import OnboardingCategoriesStep from '@/components/onboarding/OnboardingCategoriesStep';
import OnboardingFeaturesStep from '@/components/onboarding/OnboardingFeaturesStep';

const STEP_COUNT = 4;

type Props = {
  isOpen: boolean;
  onComplete: () => void;
};

const OnboardingFlow = ({ isOpen, onComplete }: Props) => {
  const { defaultCurrency } = useDataConfig();
  const [step, setStep] = useState(0);
  const currencySymbol = getCurrencySymbol(defaultCurrency || 'EUR');

  const { isSubmitting, handleComplete, handleBudgetNext, handleCategoriesNext } =
    useOnboardingActions({ onComplete, setStep });

  const renderCurrentStep = () => {
    if (step === 0) {
      return <OnboardingWelcomeStep onNext={() => setStep(1)} />;
    }
    if (step === 1) {
      return (
        <OnboardingBudgetStep
          isSubmitting={isSubmitting}
          currencySymbol={currencySymbol}
          onBack={() => setStep(0)}
          onSkip={() => setStep(2)}
          onNext={handleBudgetNext}
        />
      );
    }
    if (step === 2) {
      return (
        <OnboardingCategoriesStep
          isSubmitting={isSubmitting}
          onBack={() => setStep(1)}
          onSkip={() => setStep(3)}
          onNext={handleCategoriesNext}
        />
      );
    }

    return (
      <OnboardingFeaturesStep
        onBack={() => setStep(2)}
        onComplete={handleComplete}
      />
    );
  };

  // Dismissing the flow (swipe/Esc/X) also marks onboarding as done —
  // otherwise it re-opens on every app boot until the last step is reached.
  return (
    <Dialog open={isOpen} onOpenChange={() => handleComplete()}>
      <DialogContent
        className="sm:max-w-[420px] p-0 gap-0"
        onOpenChange={() => handleComplete()}
      >
        {/* Mobile drag handle */}
        <div
          className="flex justify-center pt-3 pb-2 sm:hidden"
          data-drag-handle
        >
          <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        </div>

        <div className="px-6 pb-6 pt-2 sm:pt-6">
          {renderStepIndicator(step)}
          {renderCurrentStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingFlow;

// ─── Helper render functions ──────────────────────────────────────────────────

const renderStepIndicator = (step: number) => (
  <div className="flex justify-center gap-1.5 mb-6">
    {Array.from({ length: STEP_COUNT }, (_, i) => (
      <div
        key={`step-${i}`}
        className={cn(
          'h-1.5 rounded-full transition-all duration-300',
          i === step && 'w-6 bg-primary',
          i !== step && 'w-1.5 bg-muted-foreground/30',
          i < step && 'bg-primary/50 w-1.5',
        )}
      />
    ))}
  </div>
);
