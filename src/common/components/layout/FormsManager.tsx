import { Dialog, DialogContent } from '@/common/ui/dialog';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import type { ExpenseWritePayload } from '@/common/api/dataService';
import type { ReceiptOptions } from '@/common/hooks/dataOps/useExpenseOps';
import { ExpensesForm } from '@/pages/expenses/components/ExpensesForm';
import { useCategoriesData, useDataConfig } from '@/common/contexts/DataContext';
import { FORM_TYPES, type FormType } from '@/common/components/layout/formTypes';

type FormsManagerProps = {
  formType: FormType;
  onClose: () => void;
  selectedExpense?: Expense;
  draft?: ExpenseWritePayload;
  draftReceiptFile?: File;
  onExpenseSubmit: (
    data: ExpenseWritePayload,
    expenseId?: string,
    receiptOptions?: ReceiptOptions,
  ) => void;
};

export const FormsManager = ({
  formType,
  onClose,
  selectedExpense,
  draft,
  draftReceiptFile,
  onExpenseSubmit,
}: FormsManagerProps) => {
  const { expenseCategories: categories } = useCategoriesData();
  const { isInitialized } = useDataConfig();

  if (!isInitialized) {
    return null;
  }

  const isExpenseForm =
    formType === FORM_TYPES.NEW_EXPENSE || formType === FORM_TYPES.EDIT_EXPENSE;
  const isEditingExpense = formType === FORM_TYPES.EDIT_EXPENSE;
  let expenseForEdit: Expense | undefined;
  if (isEditingExpense) {
    expenseForEdit = selectedExpense;
  }

  return (
    <Dialog open={isExpenseForm} onOpenChange={onClose}>
      <DialogContent
        className="gap-0 p-0 sm:max-w-[500px]"
        onOpenChange={onClose}
        onFocusOutside={(e) => e.preventDefault()}
      >
        {renderExpenseForm(
          isExpenseForm,
          expenseForEdit,
          categories,
          onClose,
          onExpenseSubmit,
          draft,
          draftReceiptFile,
        )}
      </DialogContent>
    </Dialog>
  );
};
// ─── Helper render functions ──────────────────────────────────────────────────

const renderExpenseForm = (
  isOpen: boolean,
  expense: Expense | undefined,
  categories: Category[],
  onClose: () => void,
  onSubmit: (
    data: ExpenseWritePayload,
    expenseId?: string,
    receiptOptions?: ReceiptOptions,
  ) => void,
  draft?: ExpenseWritePayload,
  draftReceiptFile?: File,
) => {
  if (!isOpen) {
    return null;
  }

  return (
    <ExpensesForm
      expense={expense}
      draft={draft}
      draftReceiptFile={draftReceiptFile}
      categories={categories}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
};
