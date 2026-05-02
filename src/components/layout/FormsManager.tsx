import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import type { ReceiptOptions } from '@/hooks/useDataOperations';
import ExpensesForm from '@/components/expenses/ExpensesForm';
import { CategoryManager } from '@/components/categories/CategoryManager';
import { useData } from '@/contexts/DataContext';

export const FORM_TYPES = {
  NEW_EXPENSE: 'newExpense',
  EDIT_EXPENSE: 'editExpense',
  NEW_CATEGORY: 'newCategory',
} as const;

export type FormType = (typeof FORM_TYPES)[keyof typeof FORM_TYPES] | null;

type FormsManagerProps = {
  formType: FormType;
  onClose: () => void;
  selectedExpense?: Expense;
  onExpenseSubmit: (
    data: Partial<Expense>,
    expenseId?: string,
    receiptOptions?: ReceiptOptions,
  ) => void;
};

const FormsManager = ({
  formType,
  onClose,
  selectedExpense,
  onExpenseSubmit,
}: FormsManagerProps) => {
  const { expenseCategories: categories, isInitialized } = useData();

  // Don't show forms until data is ready (isInitialized is sufficient —
  // checking isLoading here would unmount an open form during background refreshes,
  // destroying any input the user has already typed).
  if (!isInitialized) {
    return null;
  }

  const isExpenseForm =
    formType === FORM_TYPES.NEW_EXPENSE || formType === FORM_TYPES.EDIT_EXPENSE;
  const isCategoryForm = formType === FORM_TYPES.NEW_CATEGORY;
  const isEditingExpense = formType === FORM_TYPES.EDIT_EXPENSE;
  let expenseForEdit: Expense | undefined;
  if (isEditingExpense) {
    expenseForEdit = selectedExpense;
  }

  return (
    <>
      <Dialog open={isExpenseForm} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden"
          onOpenChange={onClose}
          onFocusOutside={(e) => e.preventDefault()}
        >
          {renderExpenseForm(
            isExpenseForm,
            expenseForEdit,
            categories,
            onClose,
            onExpenseSubmit,
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryForm} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden"
          onOpenChange={onClose}
        >
          {renderCategoryManager(isCategoryForm)}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FormsManager;

// ─── Helper render functions ──────────────────────────────────────────────────

const renderExpenseForm = (
  isOpen: boolean,
  expense: Expense | undefined,
  categories: Category[],
  onClose: () => void,
  onSubmit: (
    data: Partial<Expense>,
    expenseId?: string,
    receiptOptions?: ReceiptOptions,
  ) => void,
) => {
  if (!isOpen) return null;

  return (
    <ExpensesForm
      expense={expense}
      categories={categories}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
};

const renderCategoryManager = (isOpen: boolean) => {
  if (!isOpen) return null;

  return <CategoryManager />;
};
