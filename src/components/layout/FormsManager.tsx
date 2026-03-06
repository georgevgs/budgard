import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import type { ReceiptOptions } from '@/hooks/useDataOperations';
import ExpensesForm from '@/components/expenses/ExpensesForm';
import CategoryForm from '@/components/categories/CategoryForm';
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
  const { t } = useTranslation();
  const { categories, isInitialized, isLoading } = useData();

  // Don't show forms until data is ready
  if (!isInitialized || isLoading) {
    return null;
  }

  const isExpenseForm =
    formType === FORM_TYPES.NEW_EXPENSE || formType === FORM_TYPES.EDIT_EXPENSE;
  const isCategoryForm = formType === FORM_TYPES.NEW_CATEGORY;
  const isEditingExpense = formType === FORM_TYPES.EDIT_EXPENSE;
  const expenseActionKey = isEditingExpense ? 'forms.editExisting' : 'forms.addNew';
  const expenseForEdit = isEditingExpense ? selectedExpense : undefined;

  return (
    <>
      <Dialog open={isExpenseForm} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden"
          aria-describedby="expense-form-description"
          onOpenChange={onClose}
        >
          <div id="expense-form-description" className="sr-only">
            {t('forms.expenseDescription', {
              action: t(expenseActionKey),
            })}
          </div>
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
          className="sm:max-w-[500px] p-0 gap-0"
          aria-describedby="category-form-description"
          onOpenChange={onClose}
        >
          <div id="category-form-description" className="sr-only">
            {t('forms.categoryDescription')}
          </div>
          {renderCategoryForm(isCategoryForm, onClose)}
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

const renderCategoryForm = (isOpen: boolean, onClose: () => void) => {
  if (!isOpen) return null;

  return <CategoryForm onBack={onClose} onClose={onClose} />;
};
