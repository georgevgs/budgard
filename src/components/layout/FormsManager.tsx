import {useTranslation} from "react-i18next";
import {Dialog, DialogContent} from "@/components/ui/dialog";
import type {Expense} from "@/types/Expense";
import ExpensesForm from "@/components/expenses/ExpensesForm";
import CategoryForm from "@/components/categories/CategoryForm";
import {useData} from "@/contexts/DataContext";

export type FormType = "newExpense" | "editExpense" | "newCategory" | null;

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
    const {t} = useTranslation();
    const {categories, isInitialized, isLoading} = useData();

    // Don't show forms until data is ready
    if (!isInitialized || isLoading) {
        return null;
    }

    const isExpenseForm = formType === "newExpense" || formType === "editExpense";
    const isCategoryForm = formType === "newCategory";

    return (
        <>
            {/* Expense Form Modal */}
            <Dialog open={isExpenseForm} onOpenChange={onClose}>
                <DialogContent
                    className="sm:max-w-[425px] p-0 overflow-hidden [&>button]:hidden rounded-lg"
                    aria-describedby="expense-form-description"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div id="expense-form-description" className="sr-only">
                        {t("forms.expenseDescription", {
                            action: t(
                                formType === "editExpense"
                                    ? "forms.editExisting"
                                    : "forms.addNew"
                            )
                        })}
                    </div>
                    {isExpenseForm && (
                        <ExpensesForm
                            expense={formType === "editExpense" ? selectedExpense : undefined}
                            categories={categories}
                            onClose={onClose}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Category Form Modal */}
            <Dialog open={isCategoryForm} onOpenChange={onClose}>
                <DialogContent
                    className="sm:max-w-[425px] p-6 rounded-lg"
                    aria-describedby="category-form-description"
                >
                    <div id="category-form-description" className="sr-only">
                        {t("forms.categoryDescription")}
                    </div>
                    {isCategoryForm && (
                        <CategoryForm
                            onBack={onClose}
                            onClose={onClose}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default FormsManager;