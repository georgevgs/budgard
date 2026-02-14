import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Expense } from '@/types/Expense';
import ExpensesForm from '@/components/expenses/ExpensesForm';
import CategoryForm from '@/components/categories/CategoryForm';
import { useData } from '@/contexts/DataContext';

export const FORM_TYPES = {
  NEW_EXPENSE: 'newExpense',
  EDIT_EXPENSE: 'editExpense',
  NEW_CATEGORY: 'newCategory',
} as const;

export type FormType = (typeof FORM_TYPES)[keyof typeof FORM_TYPES] | null;

interface FormsManagerProps {
  formType: FormType;
  onClose: () => void;
  selectedExpense?: Expense;
}

const FormsManager = ({
  formType,
  onClose,
  selectedExpense,
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

  return (
    <>
      {/* Expense Form Modal */}
      <Dialog open={isExpenseForm} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden"
          aria-describedby="expense-form-description"
          onOpenChange={onClose}
        >
          <div id="expense-form-description" className="sr-only">
            {t('forms.expenseDescription', {
              action: t(
                formType === FORM_TYPES.EDIT_EXPENSE
                  ? 'forms.editExisting'
                  : 'forms.addNew',
              ),
            })}
          </div>
          {isExpenseForm && (
            <ExpensesForm
              expense={formType === FORM_TYPES.EDIT_EXPENSE ? selectedExpense : undefined}
              categories={categories}
              onClose={onClose}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Category Form Modal */}
      <Dialog open={isCategoryForm} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0"
          aria-describedby="category-form-description"
          onOpenChange={onClose}
        >
          <div id="category-form-description" className="sr-only">
            {t('forms.categoryDescription')}
          </div>
          {isCategoryForm && (
            <CategoryForm onBack={onClose} onClose={onClose} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FormsManager;
