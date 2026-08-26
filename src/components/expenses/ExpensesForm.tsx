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
import ExpenseFormActions from '@/components/expenses/ExpenseFormActions';
import { CategoryManager } from '@/components/categories/CategoryManager';
import {
  getInitialAmount,
  getInitialDate,
  getInitialExtraTagIds,
  renderFormTitle,
} from '@/components/expenses/ExpensesForm.helpers';

type ExpensesFormProps = {
  expense?: Expense;
  // What the quick-add pad captured before the user asked for more detail.
  // Only read when creating; an edit always wins from the row itself.
  draft?: ExpenseWritePayload;
  draftReceiptFile?: File;
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
  draftReceiptFile,
  categories,
  onClose,
  onSubmit,
}: ExpensesFormProps) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();
  const attachments = useExpenseAttachments(expense, draftReceiptFile);
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
      date: getInitialDate(expense, draft),
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
      {renderDragHandle()}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 sm:pt-6"
            style={{ touchAction: 'pan-y' }}
          >
            <DialogHeader className="pb-4 pr-10" data-draggable-area>
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

          <ExpenseFormActions
            isValid={form.formState.isValid}
            isSubmitting={isSubmitting}
            onClose={onClose}
          />
        </form>
      </Form>
    </div>
  );
};

export default ExpensesForm;

// --- Helpers ---

const renderDragHandle = () => (
  <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
    <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
  </div>
);
