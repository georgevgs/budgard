import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseCurrencyInput } from '@/lib/utils';
import { useBudgetOps } from '@/hooks/dataOps/useBudgetOps';
import { useCategoryOps } from '@/hooks/dataOps/useCategoryOps';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { ONBOARDED_KEY } from '@/lib/onboarding';
import { PRESET_CATEGORIES } from '@/components/onboarding/presetCategories';

type UseOnboardingActionsArgs = {
  onComplete: () => void;
  setStep: (step: number) => void;
};

export const useOnboardingActions = ({
  onComplete,
  setStep,
}: UseOnboardingActionsArgs) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { handleBudgetUpdate } = useBudgetOps();
  const { handleCategoriesAddBulk } = useCategoryOps();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = useCallback(() => {
    localStorage.setItem(ONBOARDED_KEY, 'true');
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
        }
        setIsSubmitting(false);
      }
      setStep(2);
    },
    [handleBudgetUpdate, toast, t, setStep],
  );

  const handleCategoriesNext = useCallback(
    async (selectedIndices: number[]) => {
      if (selectedIndices.length === 0) {
        setStep(3);

        return;
      }

      setIsSubmitting(true);
      try {
        const toCreate = selectedIndices.map((i) => ({
          name: t(`onboarding.presetCategories.${PRESET_CATEGORIES[i].nameKey}`),
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
      }
      setIsSubmitting(false);
      setStep(3);
    },
    [session?.user?.id, handleCategoriesAddBulk, t, toast, setStep],
  );

  return { isSubmitting, handleComplete, handleBudgetNext, handleCategoriesNext };
};
