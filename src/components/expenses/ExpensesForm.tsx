import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useDataConfig } from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { useCurrencyConversion } from '@/hooks/expenseForm/useCurrencyConversion';
import { useDescriptionSuggestions } from '@/hooks/expenseForm/useDescriptionSuggestions';
import { useTagPicker } from '@/hooks/expenseForm/useTagPicker';
import { useExpenseSubmit } from '@/hooks/expenseForm/useExpenseSubmit';
import type { ReceiptOptions } from '@/hooks/dataOps/useExpenseOps';
import { expenseSchema, type ExpenseFormData } from '@/lib/validations';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import ExpenseAmountField from '@/components/expenses/ExpenseAmountField';
import ExpenseDescriptionField from '@/components/expenses/ExpenseDescriptionField';
import ExpenseCategoryField from '@/components/expenses/ExpenseCategoryField';
import ExpenseDateField from '@/components/expenses/ExpenseDateField';
import ExpenseFormDetails from '@/components/expenses/ExpenseFormDetails';
import {
  getInitialAmount,
  getInitialDate,
  renderFormTitle,
  renderSaveButtonLabel,
} from '@/components/expenses/ExpensesForm.helpers';

type ExpensesFormProps = {
  expense?: Expense;
  categories: Category[];
  onClose: () => void;
  onSubmit: (
    data: Partial<Expense>,
    expenseId?: string,
    receiptOptions?: ReceiptOptions,
  ) => void;
};

const ExpensesForm = ({
  expense,
  categories,
  onClose,
  onSubmit,
}: ExpensesFormProps) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);
  const [showDetails, setShowDetails] = useState(() =>
    Boolean(expense?.tag_id || expense?.receipt_path),
  );

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: getInitialAmount(expense, defaultCurrency),
      description: expense?.description || '',
      category_id: expense?.category_id || 'none',
      tag_id: expense?.tag_id || undefined,
      date: getInitialDate(expense),
    },
  });

  const conversion = useCurrencyConversion(form, expense);
  const suggestions = useDescriptionSuggestions(form);
  const tagPicker = useTagPicker(form);
  const { isSubmitting, handleSubmit } = useExpenseSubmit({
    expense,
    conversion,
    receiptFile,
    removeExistingReceipt,
    onSubmit,
    onClose,
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Mobile drag handle */}
      <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      {/* Scrollable content */}
      <div
        className="overflow-y-auto flex-1 px-4 sm:px-6 sm:pt-6 overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        <DialogHeader className="pb-4" data-draggable-area>
          <DialogTitle className="text-xl">
            {renderFormTitle(Boolean(expense), t)}
          </DialogTitle>
          <DialogDescription>
            {t('expenses.formDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 pb-4"
          >
            <ExpenseAmountField form={form} conversion={conversion} />
            <ExpenseDescriptionField form={form} suggestions={suggestions} />
            <ExpenseCategoryField form={form} categories={categories} />
            <ExpenseDateField form={form} dateLocale={dateLocale} />
            <ExpenseFormDetails
              form={form}
              tagPicker={tagPicker}
              showDetails={showDetails}
              onToggleDetails={() => setShowDetails((prev) => !prev)}
              currentReceiptPath={expense?.receipt_path}
              receiptFile={receiptFile}
              isRemovingReceipt={removeExistingReceipt}
              onReceiptSelect={setReceiptFile}
              onRemoveExistingReceipt={() => setRemoveExistingReceipt(true)}
            />

            <div className="flex gap-3 justify-end pt-2 pb-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {renderSaveButtonLabel(isSubmitting, t)}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default ExpensesForm;
