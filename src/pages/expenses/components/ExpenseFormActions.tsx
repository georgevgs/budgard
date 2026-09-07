import { useTranslation } from 'react-i18next';
import { Button } from '@/common/ui/button';
import { renderSaveButtonLabel } from '@/constants/expensesFormHelpers';
import type { TranslateFunction } from '@/constants/translate';

type ExpenseFormActionsProps = {
  isValid: boolean;
  isSubmitting: boolean;
  onClose: () => void;
};

export const ExpenseFormActions = ({ isValid, isSubmitting, onClose }: ExpenseFormActionsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border/50 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-3">
      {renderSaveHint(isValid, t)}
      <div className="flex flex-nowrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting || !isValid}>
          {renderSaveButtonLabel(isSubmitting, t)}
        </Button>
      </div>
    </div>
  );
};

// A Save button that is disabled from the moment the form opens is a dead end
// unless something says why. Keep this hint separate from the button row so
// translations cannot split the paired actions across different lines.
const renderSaveHint = (
  isValid: boolean,
  t: TranslateFunction,
): React.ReactNode => {
  if (isValid) {
    return null;
  }

  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      {t('expenses.saveHint')}
    </p>
  );
};
