import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Check from 'lucide-react/dist/esm/icons/check';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type PresetCategory = {
  nameKey: string;
  color: string;
  icon: string;
};

export const PRESET_CATEGORIES: PresetCategory[] = [
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
  isSubmitting: boolean;
  onBack: () => void;
  onSkip: () => void;
  onNext: (selectedIndices: number[]) => void;
};

const OnboardingCategoriesStep = ({
  isSubmitting,
  onBack,
  onSkip,
  onNext,
}: Props) => {
  const { t } = useTranslation();
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(
    new Set([0, 1, 2, 3]),
  );

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

  return (
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
                isSelected && 'border-primary bg-primary/10 text-foreground',
                !isSelected && 'border-border/50 bg-card text-muted-foreground hover:border-border',
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
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          disabled={isSubmitting}
          aria-label={t('common.back')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          className="flex-1"
          onClick={onSkip}
          disabled={isSubmitting}
        >
          {t('onboarding.skip')}
        </Button>
        <Button
          className="flex-1"
          onClick={() => onNext(Array.from(selectedCategories))}
          disabled={isSubmitting}
        >
          {t('onboarding.next')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default OnboardingCategoriesStep;

// ─── Helper render functions ──────────────────────────────────────────────────

const renderCheckIcon = (isSelected: boolean) => {
  if (!isSelected) return null;

  return <Check className="h-4 w-4 text-primary shrink-0" />;
};
