import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDialogDirty } from '@/common/hooks/useDialogDirty';
import {
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/common/ui/dialog';
import { Form } from '@/common/ui/form';
import { useDataConfig } from '@/common/contexts/DataContext';
import { useDateLocale } from '@/common/hooks/useDateLocale';
import { useCurrencyConversion } from '@/pages/expenses/hooks/useCurrencyConversion';
import { useExpenseAttachments } from '@/pages/expenses/hooks/useExpenseAttachments';
import { useDescriptionSuggestions } from '@/pages/expenses/hooks/useDescriptionSuggestions';
import { useTagPicker } from '@/pages/expenses/hooks/useTagPicker';
import { useExpenseSubmit } from '@/pages/expenses/hooks/useExpenseSubmit';
import type { ReceiptOptions } from '@/common/hooks/dataOps/useExpenseOps';
import { expenseSchema, type ExpenseFormData } from '@/pages/expenses/validations';
import type { ExpenseWritePayload } from '@/common/api/dataService';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import { ExpenseAmountField } from '@/pages/expenses/components/ExpenseAmountField';
import { ExpenseDescriptionField } from '@/pages/expenses/components/ExpenseDescriptionField';
import { ExpenseCategoryField } from '@/pages/expenses/components/ExpenseCategoryField';
import { ExpenseDateField } from '@/pages/expenses/components/ExpenseDateField';
import { ExpenseFormDetails } from '@/pages/expenses/components/ExpenseFormDetails';
import { ExpenseFormActions } from '@/pages/expenses/components/ExpenseFormActions';
import { CategoryManager } from '@/common/components/categories/CategoryManager';
import {
  getInitialAmount,
  getInitialDate,
  getInitialExtraTagIds,
  renderFormTitle,
} from '@/constants/expensesFormHelpers';

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

export const ExpensesForm = ({
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
    shouldRemoveExistingReceipt: attachments.shouldRemoveExistingReceipt,
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
                shouldShowDetails={attachments.shouldShowDetails}
                onToggleDetails={attachments.toggleDetails}
                currentReceiptPath={expense?.receipt_path}
                receiptFile={attachments.receiptFile}
                isRemovingReceipt={attachments.shouldRemoveExistingReceipt}
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

const renderDragHandle = () => (
  <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
    <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
  </div>
);
