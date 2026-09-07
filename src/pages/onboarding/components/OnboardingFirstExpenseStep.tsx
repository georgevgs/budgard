import { useTranslation } from 'react-i18next';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import { Button } from '@/common/ui/button';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/common/ui/dialog';
import { AmountKeypad } from '@/pages/expenses/components/AmountKeypad';
import { QuickAddCategories } from '@/pages/expenses/components/QuickAddCategories';
import { QuickAddName } from '@/pages/expenses/components/QuickAddName';
import { useQuickAddDraft } from '@/pages/expenses/hooks/useQuickAddDraft';
import { cn, formatCurrency } from '@/constants/utils';

type OnboardingFirstExpenseStepProps = {
  draft: ReturnType<typeof useQuickAddDraft>;
  onBack: () => void;
  onSkip: () => void;
};

export const OnboardingFirstExpenseStep = ({ draft, onBack, onSkip }: OnboardingFirstExpenseStepProps) => {
  const { t } = useTranslation();

  return (
    <div>
      <DialogHeader>
        <DialogTitle className="text-xl">
          {t('onboarding.firstExpenseTitle')}
        </DialogTitle>
        <DialogDescription>
          {t('onboarding.firstExpenseDescription')}
        </DialogDescription>
      </DialogHeader>

      <p
        className={cn(
          'px-8 py-5 text-center type-figure-lg',
          amountTone(draft.pad.isEmpty),
        )}
        aria-live="polite"
      >
        {formatCurrency(draft.pad.amount, draft.currency)}
      </p>

      <QuickAddName
        value={draft.name}
        suggestions={draft.suggestions}
        errorKey={draft.nameErrorKey}
        onChange={draft.setName}
        onSelect={draft.applySuggestion}
      />
      <div className="mt-3">
        <QuickAddCategories
          categories={draft.categories}
          selectedId={draft.categoryId}
          onSelect={draft.selectCategory}
        />
      </div>
      <div className="mt-4">
        <AmountKeypad pad={draft.pad} />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={t('common.back')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" className="shrink-0" onClick={onSkip}>
          {t('onboarding.exploreFirst')}
        </Button>
        <Button
          className="min-w-0 flex-1"
          disabled={!draft.canSave}
          onClick={() => draft.submit()}
        >
          {t('onboarding.saveFirstExpense')}
        </Button>
      </div>
    </div>
  );
};

const amountTone = (isEmpty: boolean): string => {
  if (isEmpty) {
    return 'text-muted-foreground/40';
  }

  return 'text-foreground';
};
