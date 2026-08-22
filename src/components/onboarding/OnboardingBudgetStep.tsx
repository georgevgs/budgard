import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
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
  onBack: () => void;
  onSkip: () => void;
  onNext: (budgetInput: string) => void;
};

const OnboardingBudgetStep = ({
  isSubmitting,
  currencySymbol,
  onBack,
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
        {/* Decorative: the accessible name comes from aria-label, and reading
            the symbol out separately would just announce "euro" on its own. */}
        <span
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg"
        >
          {currencySymbol}
        </span>
        <Input
          type="text"
          inputMode="decimal"
          pattern="[0-9,.]*"
          placeholder={t('onboarding.budgetPlaceholder')}
          // Without this the field announces as "edit text, 1.500" — the
          // placeholder is a formatting hint, not a name, and it disappears
          // the moment anything is typed.
          aria-label={t('onboarding.budgetAmountLabel')}
          value={budgetInput}
          onChange={(e) => setBudgetInput(formatCurrencyInput(e.target.value))}
          className="pl-8 text-lg h-12"
          autoComplete="off"
        />
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
