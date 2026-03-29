import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Check from 'lucide-react/dist/esm/icons/check';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import { dataService } from '@/services/dataService';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/hooks/useAuth';

const ONBOARDED_KEY = 'budgard_onboarded';
const STEP_COUNT = 3;

type PresetCategory = {
  nameKey: string;
  color: string;
  icon: string;
};

const PRESET_CATEGORIES: PresetCategory[] = [
  { nameKey: 'food', color: '#22c55e', icon: '🍔' },
  { nameKey: 'housing', color: '#6366f1', icon: '🏠' },
  { nameKey: 'transport', color: '#3b82f6', icon: '🚗' },
  { nameKey: 'entertainment', color: '#f97316', icon: '🎬' },
  { nameKey: 'subscriptions', color: '#ec4899', icon: '📱' },
  { nameKey: 'health', color: '#14b8a6', icon: '💊' },
  { nameKey: 'shopping', color: '#8b5cf6', icon: '👕' },
  { nameKey: 'utilities', color: '#f59e0b', icon: '💡' },
];

type Props = {
  isOpen: boolean;
  onComplete: () => void;
};

export const OnboardingFlow = ({ isOpen, onComplete }: Props) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { setMonthlyBudget, setCategories } = useData();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Budget
  const [budgetInput, setBudgetInput] = useState('');

  // Step 2: Categories
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(
    new Set([0, 1, 2, 3]),
  );

  const handleComplete = useCallback(() => {
    localStorage.setItem(ONBOARDED_KEY, 'true');
    onComplete();
  }, [onComplete]);

  const handleBudgetNext = useCallback(async () => {
    const amount = parseCurrencyInput(budgetInput);
    if (amount > 0) {
      setIsSubmitting(true);
      try {
        await dataService.upsertBudget(amount);
        setMonthlyBudget(amount);
      } catch {
        // non-critical, continue onboarding
      }
      setIsSubmitting(false);
    }
    setStep(1);
  }, [budgetInput, setMonthlyBudget]);

  const handleCategoriesNext = useCallback(async () => {
    if (selectedCategories.size === 0) {
      setStep(2);

      return;
    }

    setIsSubmitting(true);
    try {
      const toCreate = Array.from(selectedCategories).map(
        (i) => PRESET_CATEGORIES[i],
      );
      const created = await Promise.all(
        toCreate.map((cat) =>
          dataService.createCategory({
            name: t(`onboarding.presetCategories.${cat.nameKey}`),
            color: cat.color,
            icon: cat.icon,
            user_id: session?.user?.id,
          }),
        ),
      );
      setCategories(created);
    } catch {
      // non-critical, continue
    }
    setIsSubmitting(false);
    setStep(2);
  }, [selectedCategories, session?.user?.id, setCategories]);

  const handleCategoryToggle = useCallback((index: number) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      return next;
    });
  }, []);

  const renderStepIndicator = () => (
    <div className="flex justify-center gap-1.5 mb-6">
      {Array.from({ length: STEP_COUNT }, (_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30',
            i < step && 'bg-primary/50 w-1.5',
          )}
        />
      ))}
    </div>
  );

  const renderBudgetStep = () => (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="text-xl">
          {t('onboarding.budgetTitle')}
        </DialogTitle>
        <DialogDescription>
          {t('onboarding.budgetDescription')}
        </DialogDescription>
      </DialogHeader>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
          &euro;
        </span>
        <Input
          type="text"
          inputMode="decimal"
          pattern="[0-9,.]*"
          placeholder={t('onboarding.budgetPlaceholder')}
          value={budgetInput}
          onChange={(e) => setBudgetInput(formatCurrencyInput(e.target.value))}
          className="pl-8 text-lg h-12"
          autoComplete="off"
        />
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={() => setStep(1)}>
          {t('onboarding.skip')}
        </Button>
        <Button
          className="flex-1"
          onClick={handleBudgetNext}
          disabled={isSubmitting}
        >
          {t('onboarding.next')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderCategoriesStep = () => (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="text-xl">
          {t('onboarding.categoriesTitle')}
        </DialogTitle>
        <DialogDescription>
          {t('onboarding.categoriesDescription')}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-2">
        {PRESET_CATEGORIES.map((cat, index) => {
          const isSelected = selectedCategories.has(index);

          return (
            <button
              key={cat.nameKey}
              type="button"
              onClick={() => handleCategoryToggle(index)}
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium transition-all border',
                isSelected
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border/50 bg-card text-muted-foreground hover:border-border',
              )}
            >
              <span className="text-base shrink-0">{cat.icon}</span>
              <span className="flex-1 text-left">
                {t(`onboarding.presetCategories.${cat.nameKey}`)}
              </span>
              {renderCheckIcon(isSelected)}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={() => setStep(2)}>
          {t('onboarding.skip')}
        </Button>
        <Button
          className="flex-1"
          onClick={handleCategoriesNext}
          disabled={isSubmitting}
        >
          {t('onboarding.next')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderDoneStep = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Check className="h-8 w-8 text-primary" />
      </div>

      <DialogHeader>
        <DialogTitle className="text-xl">
          {t('onboarding.doneTitle')}
        </DialogTitle>
        <DialogDescription>{t('onboarding.doneDescription')}</DialogDescription>
      </DialogHeader>

      <Button className="w-full" size="lg" onClick={handleComplete}>
        {t('onboarding.startTracking')}
      </Button>
    </div>
  );

  const renderCurrentStep = () => {
    if (step === 0) return renderBudgetStep();
    if (step === 1) return renderCategoriesStep();

    return renderDoneStep();
  };

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
          {renderStepIndicator()}
          {renderCurrentStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Helper render functions ──────────────────────────────────────────────────

const renderCheckIcon = (isSelected: boolean) => {
  if (!isSelected) return null;

  return <Check className="h-4 w-4 text-primary shrink-0" />;
};

export const shouldShowOnboarding = (
  isInitialized: boolean,
  isLoading: boolean,
  expenseCount: number,
  categoryCount: number,
  monthlyBudget: number | null,
): boolean => {
  if (!isInitialized || isLoading) return false;
  if (localStorage.getItem(ONBOARDED_KEY) === 'true') return false;

  return expenseCount === 0 && categoryCount === 0 && monthlyBudget === null;
};
