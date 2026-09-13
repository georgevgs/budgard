import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseCurrencyInput } from '@/constants/utils';
import { useBudgetOps } from '@/common/hooks/dataOps/useBudgetOps';
import { useCategoryOps } from '@/common/hooks/dataOps/useCategoryOps';
import { useAuth } from '@/common/contexts/AuthContext';
import { useToast } from '@/common/hooks/useToast';
import {
  completeOnboarding,
  readOnboardingStep,
  saveOnboardingStep,
  startOnboarding,
} from '@/pages/onboarding/utils/onboarding';
import { PRESET_CATEGORIES } from '@/pages/onboarding/components/presetCategories';
import { trackProductEvent } from '@/common/api/productEventService';

type UseOnboardingActionsArgs = {
  onComplete: () => void;
};

export const useOnboardingActions = ({
  onComplete,
}: UseOnboardingActionsArgs) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { handleBudgetUpdate } = useBudgetOps();
  const { handleCategoriesAddBulk } = useCategoryOps();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setCurrentStep] = useState(readOnboardingStep);

  useEffect(() => {
    if (startOnboarding()) {
      trackProductEvent({ name: 'onboarding_started' });
    }
  }, []);

  const setStep = useCallback((nextStep: number) => {
    saveOnboardingStep(nextStep);
    setCurrentStep(nextStep);
  }, []);

  const handleComplete = useCallback(() => {
    trackProductEvent({ name: 'onboarding_completed' });
    completeOnboarding();
    onComplete();
  }, [onComplete]);

  const handleBudgetNext = useCallback(
    async (budgetInput: string) => {
      const amount = parseCurrencyInput(budgetInput);
      if (amount > 0) {
        setIsSubmitting(true);
        try {
          await handleBudgetUpdate(amount);
        } catch {
          toast({
            variant: 'destructive',
            description: t('onboarding.budgetSaveFailed'),
          });

          setIsSubmitting(false);

          return;
        }
        setIsSubmitting(false);
      }
      handleComplete();
    },
    [handleBudgetUpdate, toast, t, handleComplete],
  );

  const handleCategoriesNext = useCallback(
    async (selectedIndices: number[]) => {
      if (selectedIndices.length === 0) {
        trackProductEvent({ name: 'onboarding_categories_submitted' });
        setStep(2);

        return;
      }

      setIsSubmitting(true);
      try {
        const toCreate = selectedIndices.map((i) => ({
          name: t(
            `onboarding.presetCategories.${PRESET_CATEGORIES[i].nameKey}`,
          ),
          color: PRESET_CATEGORIES[i].color,
          icon: PRESET_CATEGORIES[i].icon,
          user_id: session?.user?.id,
        }));
        await handleCategoriesAddBulk(toCreate);
      } catch {
        toast({
          variant: 'destructive',
          description: t('onboarding.categoriesSaveFailed'),
        });

        setIsSubmitting(false);

        return;
      }
      setIsSubmitting(false);
      trackProductEvent({ name: 'onboarding_categories_submitted' });
      setStep(2);
    },
    [session?.user?.id, handleCategoriesAddBulk, t, toast, setStep],
  );

  return {
    step,
    setStep,
    isSubmitting,
    handleComplete,
    handleBudgetNext,
    handleCategoriesNext,
  };
};
