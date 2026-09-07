import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDialogDirty } from '@/common/hooks/useDialogDirty';
import {
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/common/ui/dialog';
import { Button } from '@/common/ui/button';
import { CategoryManager } from '@/pages/categories/components/CategoryManager';
import { Form } from '@/common/ui/form';
import { useDateLocale } from '@/common/hooks/useDateLocale';
import { useDataConfig } from '@/common/contexts/DataContext';
import { useIncomeCurrencyConversion } from '@/pages/income/hooks/useIncomeCurrencyConversion';
import { useIncomeCategoryPicker } from '@/pages/income/hooks/useIncomeCategoryPicker';
import { useIncomeSubmit } from '@/pages/income/hooks/useIncomeSubmit';
import { incomeSchema, type IncomeFormData } from '@/pages/income/validations';
import type { Expense } from '@/types/Expense';
import { IncomeAmountField } from '@/pages/income/components/IncomeAmountField';
import { IncomeDescriptionField } from '@/pages/income/components/IncomeDescriptionField';
import { IncomeCategoryField } from '@/pages/income/components/IncomeCategoryField';
import { IncomeDateField } from '@/pages/income/components/IncomeDateField';
import {
  getInitialAmount,
  getInitialDate,
  renderFormTitle,
  renderSaveButtonLabel,
} from '@/pages/income/components/IncomeForm.helpers';

type IncomeFormProps = {
  income?: Expense;
  onClose: (savedIncome?: Expense) => void;
};

export const IncomeForm = ({ income, onClose }: IncomeFormProps) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    mode: 'onTouched',
    defaultValues: {
      amount: getInitialAmount(income, defaultCurrency),
      description: income?.description || '',
      category_id: income?.category_id || 'none',
      date: getInitialDate(income),
    },
  });

  useDialogDirty(form.formState.isDirty);

  const conversion = useIncomeCurrencyConversion(form, income);
  const picker = useIncomeCategoryPicker(form);
  const { isSubmitting, handleSubmit } = useIncomeSubmit({
    income,
    conversion,
    onClose,
  });

  if (picker.isManagerOpen) {
    return (
      <CategoryManager
        categoryType="income"
        onBack={() => picker.setIsManagerOpen(false)}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Mobile drag handle */}
      <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => handleSubmit(values))}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6"
            style={{ touchAction: 'pan-y' }}
          >
            <DialogHeader className="pb-4 pr-10" data-draggable-area>
              <DialogTitle className="text-xl">
                {renderFormTitle(Boolean(income), t)}
              </DialogTitle>
              <DialogDescription>
                {t('income.formDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pb-4">
              <IncomeAmountField form={form} conversion={conversion} />
              <IncomeDescriptionField form={form} />
              <IncomeCategoryField form={form} picker={picker} />
              <IncomeDateField form={form} dateLocale={dateLocale} />
            </div>
          </div>

          {renderActions(isSubmitting, form.formState.isValid, onClose, t)}
        </form>
      </Form>
    </div>
  );
};
// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderActions = (
  isSubmitting: boolean,
  isValid: boolean,
  onClose: () => void,
  t: TFunc,
) => (
  <div className="flex shrink-0 justify-end gap-3 border-t border-border/50 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-3">
    <Button type="button" variant="outline" onClick={onClose}>
      {t('common.cancel')}
    </Button>
    <Button
      type="submit"
      disabled={isSubmitting || !isValid}
      className="bg-income text-income-foreground hover:bg-income/90"
    >
      {renderSaveButtonLabel(isSubmitting, t)}
    </Button>
  </div>
);
