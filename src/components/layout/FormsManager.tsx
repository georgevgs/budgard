import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Expense } from "@/types/Expense";
import type { Category } from "@/types/Category";
import ExpensesForm from "@/components/expenses/ExpensesForm.tsx";
import CategoryForm from "@/components/categories/CategoryForm.tsx";

export type FormType = 'newExpense' | 'editExpense' | 'newCategory' | null;

interface FormsManagerProps {
    formType: FormType;
    onClose: () => void;
    selectedExpense?: Expense;
    categories: Category[];
    onExpenseSubmit: (expenseData: Partial<Expense>, expenseId?: string) => Promise<void>;
    onCategoryAdd: (categoryData: Partial<Category>) => Promise<void>;
}

const FormsManager = ({
    formType,
    onClose,
    selectedExpense,
    categories,
    onExpenseSubmit,
    onCategoryAdd,
}: FormsManagerProps) => {
    const isExpenseForm = formType === 'newExpense' || formType === 'editExpense';
    const isCategoryForm = formType === 'newCategory';

    return (
        <>
            {/* Expense Form Modal */}
            <Dialog open={isExpenseForm} onOpenChange={onClose}>
                <DialogContent
                    className="sm:max-w-[425px] p-0 overflow-hidden [&>button]:hidden rounded-lg"
                    aria-describedby="expense-form-description"
                >
                    <div id="expense-form-description" className="sr-only">
                        Form to {formType === 'editExpense' ? 'edit an existing' : 'add a new'} expense
                    </div>
                    <ExpensesForm
                        expense={formType === 'editExpense' ? selectedExpense : undefined}
                        categories={categories}
                        onSubmit={onExpenseSubmit}
                        onClose={onClose}
                    />
                </DialogContent>
            </Dialog>

            {/* Category Form Modal */}
            <Dialog open={isCategoryForm} onOpenChange={onClose}>
                <DialogContent
                    className="sm:max-w-[425px] p-6 rounded-lg"
                    aria-describedby="category-form-description"
                >
                    <div id="category-form-description" className="sr-only">
                        Form to add a new expense category
                    </div>
                    <CategoryForm
                        onSubmit={async (categoryData) => {
                            await onCategoryAdd(categoryData);
                            onClose();
                        }}
                        onBack={onClose}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
};

export default FormsManager;