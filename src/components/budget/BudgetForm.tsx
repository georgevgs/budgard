import { useTranslation } from 'react-i18next';
import type { UseFormRegister } from 'react-hook-form';
import { useBudgetForm } from '@/hooks/budget/useBudgetForm';
import type { BudgetFormData } from '@/lib/validations';
import { formatCurrency } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type BudgetFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
  currentBudget: number | null;
  currencyCode?: string;
}

const BudgetForm = ({
  isOpen,
  onClose,
  onSubmit,
  currentBudget,
  currencyCode = 'EUR',
}: BudgetFormProps) => {
  const { t } = useTranslation();
  const form = useBudgetForm({ isOpen, currentBudget, onSubmit, onClose });
  const isEditing = currentBudget !== null;

  const handleOpenChange = (open: boolean) => {
    if (open) {
      return;
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[400px] p-0 gap-0"
        onOpenChange={handleOpenChange}
      >
        <div
          className="flex justify-center pt-3 pb-2 sm:hidden"
          data-drag-handle
        >
          <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        </div>

        <div className="px-6 pb-6 pt-2 sm:pt-6">
          <DialogHeader className="pb-4" data-draggable-area>
            <DialogTitle>{renderTitle(isEditing, t)}</DialogTitle>
            <DialogDescription>
              {renderDescription(isEditing, currentBudget, currencyCode, t)}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.submit} className="space-y-4">
            {renderAmountField(form, currencyCode, t)}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={form.isSubmitting || !form.isValid}
              >
                {renderSubmitContent(form.isSubmitting, isEditing, t)}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetForm;

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

type BudgetFormApi = {
  register: UseFormRegister<BudgetFormData>;
  handleAmountChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  errorMessage: string | undefined;
};

const renderAmountField = (
  form: BudgetFormApi,
  currencyCode: string,
  t: TranslateFunction,
) => (
  <div className="space-y-2">
    <Label htmlFor="budget-amount">{t('budget.amountLabel')}</Label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {getCurrencySymbol(currencyCode)}
      </span>
      <Input
        id="budget-amount"
        {...form.register('amount')}
        onChange={form.handleAmountChange}
        placeholder={t('budget.amountPlaceholder')}
        aria-label={t('budget.amountAriaLabel')}
        className="pl-8"
        autoComplete="off"
      />
    </div>
    {renderAmountError(form.errorMessage)}
  </div>
);

const renderTitle = (isEditing: boolean, t: TranslateFunction) => {
  if (isEditing) {
    return t('budget.editBudget');
  }

  return t('budget.setBudget');
};

const renderDescription = (
  isEditing: boolean,
  currentBudget: number | null,
  currencyCode: string,
  t: TranslateFunction,
) => {
  if (isEditing && currentBudget !== null) {
    return t('budget.updateDescription', {
      amount: formatCurrency(currentBudget, currencyCode),
    });
  }

  return t('budget.setDescription');
};

const renderAmountError = (message: string | undefined) => {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive-ink">{message}</p>;
};

const renderSubmitContent = (
  isSubmitting: boolean,
  isEditing: boolean,
  t: TranslateFunction,
) => {
  if (isSubmitting) {
    return (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('common.saving')}
      </>
    );
  }

  if (isEditing) {
    return t('budget.updateButton');
  }

  return t('budget.setButton');
};
