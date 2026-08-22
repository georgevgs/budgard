import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDialogDirty } from '@/hooks/useDialogDirty';
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
import { useExpenseAttachments } from '@/hooks/expenseForm/useExpenseAttachments';
import { useDescriptionSuggestions } from '@/hooks/expenseForm/useDescriptionSuggestions';
import { useTagPicker } from '@/hooks/expenseForm/useTagPicker';
import { useExpenseSubmit } from '@/hooks/expenseForm/useExpenseSubmit';
import type { ReceiptOptions } from '@/hooks/dataOps/useExpenseOps';
import { expenseSchema, type ExpenseFormData } from '@/lib/validations';
import type { ExpenseWritePayload } from '@/services/dataService';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import ExpenseAmountField from '@/components/expenses/ExpenseAmountField';
import ExpenseDescriptionField from '@/components/expenses/ExpenseDescriptionField';
import ExpenseCategoryField from '@/components/expenses/ExpenseCategoryField';
import ExpenseDateField from '@/components/expenses/ExpenseDateField';
import ExpenseFormDetails from '@/components/expenses/ExpenseFormDetails';
import { CategoryManager } from '@/components/categories/CategoryManager';
import {
  getInitialAmount,
  getInitialDate,
  getInitialExtraTagIds,
  renderFormTitle,
  renderSaveButtonLabel,
} from '@/components/expenses/ExpensesForm.helpers';

type ExpensesFormProps = {
  expense?: Expense;
  // What the quick-add pad captured before the user asked for more detail.
  // Only read when creating; an edit always wins from the row itself.
  draft?: ExpenseWritePayload;
  categories: Category[];
  onClose: () => void;
  onSubmit: (
    data: ExpenseWritePayload,
    expenseId?: string,
    receiptOptions?: ReceiptOptions,
  ) => void;
};

const ExpensesForm = ({
  expense,
  draft,
  categories,
  onClose,
  onSubmit,
}: ExpensesFormProps) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();
  const attachments = useExpenseAttachments(expense);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    mode: 'onTouched',
    defaultValues: {
      amount: getInitialAmount(expense, defaultCurrency, draft),
      description: expense?.description || draft?.description || '',
      category_id: expense?.category_id || draft?.category_id || 'none',
      tag_id: expense?.tag_id || undefined,
      extra_tag_ids: getInitialExtraTagIds(expense),
      date: getInitialDate(expense),
    },
  });

  useDialogDirty(form.formState.isDirty);

  const conversion = useCurrencyConversion(form, expense);
  const suggestions = useDescriptionSuggestions(form);
  const tagPicker = useTagPicker(form);
  const { isSubmitting, handleSubmit } = useExpenseSubmit({
    expense,
    conversion,
    receiptFile: attachments.receiptFile,
    removeExistingReceipt: attachments.removeExistingReceipt,
    onSubmit,
    onClose,
  });

  if (isCategoryManagerOpen) {
    return <CategoryManager onBack={() => setIsCategoryManagerOpen(false)} />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Mobile drag handle */}
      <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 sm:pt-6"
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

            <div className="space-y-4 pb-4">
              <ExpenseAmountField form={form} conversion={conversion} />
              <ExpenseDescriptionField form={form} suggestions={suggestions} />
              <ExpenseCategoryField
                form={form}
                categories={categories}
                onManageCategories={() => setIsCategoryManagerOpen(true)}
              />
              <ExpenseDateField form={form} dateLocale={dateLocale} />
              <ExpenseFormDetails
                form={form}
                tagPicker={tagPicker}
                showDetails={attachments.showDetails}
                onToggleDetails={attachments.toggleDetails}
                currentReceiptPath={expense?.receipt_path}
                receiptFile={attachments.receiptFile}
                isRemovingReceipt={attachments.removeExistingReceipt}
                onReceiptSelect={attachments.setReceiptFile}
                onRemoveExistingReceipt={attachments.removeReceipt}
              />
            </div>
          </div>

          {renderActions(form.formState.isValid, isSubmitting, onClose, t)}
        </form>
      </Form>
    </div>
  );
};

export default ExpensesForm;

// --- Helpers ---

// A Save button that is disabled from the moment the form opens is a dead end
// unless something says why — validation is onTouched, so a pristine form has
// no field errors to read yet. The hint stands in until the fields can speak
// for themselves.
const renderActions = (
  isValid: boolean,
  isSubmitting: boolean,
  onClose: () => void,
  t: (key: string) => string,
) => (
  <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border/50 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-3">
    {renderSaveHint(isValid, t)}
    <Button type="button" variant="outline" onClick={onClose}>
      {t('common.cancel')}
    </Button>
    <Button type="submit" disabled={isSubmitting || !isValid}>
      {renderSaveButtonLabel(isSubmitting, t)}
    </Button>
  </div>
);

const renderSaveHint = (isValid: boolean, t: (key: string) => string) => {
  if (isValid) {
    return null;
  }

  return (
    <p className="mr-auto text-xs leading-relaxed text-muted-foreground">
      {t('expenses.saveHint')}
    </p>
  );
};
