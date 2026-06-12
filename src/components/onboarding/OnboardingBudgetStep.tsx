import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrencyInput } from '@/lib/utils';

type Props = {
  isSubmitting: boolean;
  currencySymbol: string;
  onSkip: () => void;
  onNext: (budgetInput: string) => void;
};

const OnboardingBudgetStep = ({
  isSubmitting,
  currencySymbol,
  onSkip,
  onNext,
}: Props) => {
  const { t } = useTranslation();
  const [budgetInput, setBudgetInput] = useState('');

  return (
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
          {currencySymbol}
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
          onClick={() => onNext(budgetInput)}
          disabled={isSubmitting}
        >
          {t('onboarding.next')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default OnboardingBudgetStep;
