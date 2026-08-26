import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import { useDataConfig } from '@/contexts/DataContext';
import { useQuickAdd } from '@/contexts/QuickAddContext';
import { useQuickAddDraft } from '@/hooks/expenseForm/useQuickAddDraft';
import { useOnboardingActions } from '@/hooks/onboarding/useOnboardingActions';
import OnboardingWelcomeStep from '@/components/onboarding/OnboardingWelcomeStep';
import OnboardingBudgetStep from '@/components/onboarding/OnboardingBudgetStep';
import OnboardingCategoriesStep from '@/components/onboarding/OnboardingCategoriesStep';
import OnboardingFirstExpenseStep from '@/components/onboarding/OnboardingFirstExpenseStep';

const STEP_COUNT = 4;

type Props = {
  isOpen: boolean;
  onComplete: () => void;
  onDismiss?: () => void;
};

const OnboardingFlow = ({ isOpen, onComplete, onDismiss }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { defaultCurrency } = useDataConfig();
  const quickAdd = useQuickAdd();
  const currencySymbol = getCurrencySymbol(defaultCurrency || 'EUR');
  const finishFlow = useCallback(() => {
    onComplete();
    navigate('/today', { replace: true, viewTransition: true });
  }, [onComplete, navigate]);

  const {
    step,
    setStep,
    isSubmitting,
    handleComplete,
    handleBudgetNext,
    handleCategoriesNext,
  } = useOnboardingActions({ onComplete: finishFlow });
  const handleFirstExpense = useCallback(
    (data: Parameters<typeof quickAdd.handleExpenseFormSubmit>[0]) => {
      quickAdd.handleExpenseFormSubmit(data);
      setStep(2);
    },
    [quickAdd, setStep],
  );
  const keepFlowOpen = useCallback(() => {}, []);
  const firstExpense = useQuickAddDraft({
    isOpen: isOpen && step === 1,
    onSubmit: handleFirstExpense,
    onClose: keepFlowOpen,
  });
  const handleDismiss = onDismiss ?? onComplete;

  const renderCurrentStep = () => {
    if (step === 0) {
      return <OnboardingWelcomeStep onNext={() => setStep(1)} />;
    }
    if (step === 1) {
      return (
        <OnboardingFirstExpenseStep
          draft={firstExpense}
          onBack={() => setStep(0)}
          onSkip={() => setStep(2)}
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
      <OnboardingBudgetStep
        isSubmitting={isSubmitting}
        currencySymbol={currencySymbol}
        onBack={() => setStep(2)}
        onSkip={handleComplete}
        onNext={handleBudgetNext}
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => dismiss(open, handleDismiss)}>
      <DialogContent
        className="sm:max-w-[420px] p-0 gap-0"
        onOpenChange={(open) => dismiss(open, handleDismiss)}
      >
        {/* Mobile drag handle */}
        <div
          className="flex justify-center pt-3 pb-2 sm:hidden"
          data-drag-handle
        >
          <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-6 sm:pt-6">
          {renderStepIndicator(step, t)}
          {renderCurrentStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingFlow;

// ─── Helper render functions ──────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderStepIndicator = (step: number, t: TFunc) => (
  <div
    role="progressbar"
    aria-valuemin={1}
    aria-valuemax={STEP_COUNT}
    aria-valuenow={step + 1}
    aria-valuetext={t('onboarding.progress', {
      current: step + 1,
      total: STEP_COUNT,
    })}
    className="mb-6 flex justify-center gap-1.5"
  >
    {Array.from({ length: STEP_COUNT }, (_, i) => (
      <div
        key={`step-${i}`}
        aria-hidden="true"
        className={getStepClass(i, step)}
      />
    ))}
  </div>
);

const getStepClass = (index: number, currentStep: number): string => {
  const base =
    'h-1.5 rounded-full transition-[width,background-color] duration-300';
  if (index === currentStep) {
    return cn(base, 'w-6 bg-primary');
  }
  if (index < currentStep) {
    return cn(base, 'w-1.5 bg-primary/50');
  }

  return cn(base, 'w-1.5 bg-muted-foreground/30');
};

const dismiss = (isOpen: boolean, onDismiss: () => void): void => {
  if (isOpen) {
    return;
  }

  onDismiss();
};
