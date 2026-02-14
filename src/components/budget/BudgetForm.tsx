import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { budgetSchema, type BudgetFormData } from '@/lib/validations';
import { formatCurrencyInput, parseCurrencyInput, formatCurrency } from '@/lib/utils';
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

interface BudgetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
  currentBudget: number | null;
}

const BudgetForm = ({
  isOpen,
  onClose,
  onSubmit,
  currentBudget,
}: BudgetFormProps) => {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      amount: currentBudget ? formatCurrencyInput(currentBudget.toString()) : '',
    },
  });

  // Reset form when dialog opens/closes or currentBudget changes
  useEffect(() => {
    if (isOpen) {
      reset({
        amount: currentBudget ? formatCurrencyInput(currentBudget.toString()) : '',
      });
    }
  }, [isOpen, currentBudget, reset]);

  const handleFormSubmit = async (data: BudgetFormData) => {
    const amount = parseCurrencyInput(data.amount);
    await onSubmit(amount);
    onClose();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setValue('amount', formatted, { shouldValidate: true });
  };

  const isEditing = currentBudget !== null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[400px] p-0 gap-0"
        onOpenChange={(open) => !open && onClose()}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
          <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        </div>

        <div className="px-6 pb-6 pt-2 sm:pt-6">
          <DialogHeader className="pb-4" data-draggable-area>
            <DialogTitle>
              {isEditing ? t('budget.editBudget') : t('budget.setBudget')}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? t('budget.updateDescription', {
                    amount: formatCurrency(currentBudget),
                  })
                : t('budget.setDescription')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="budget-amount">{t('budget.amountLabel')}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                &euro;
              </span>
              <Input
                id="budget-amount"
                {...register('amount')}
                onChange={handleAmountChange}
                placeholder={t('budget.amountPlaceholder')}
                aria-label={t('budget.amountAriaLabel')}
                className="pl-8"
                autoComplete="off"
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t('common.saving')
                : isEditing
                  ? t('budget.updateButton')
                  : t('budget.setButton')}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetForm;
