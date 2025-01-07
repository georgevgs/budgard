import {useState} from "react";
import {format} from "date-fns";
import type {Expense} from "@/types/Expense";
import type {Category} from "@/types/Category";
import {cn} from "@/lib/utils";
import FormsManager, {FormType} from "@/components/layout/FormsManager";
import SpeedDial from "@/components/layout/SpeedDial";
import ExpensesMonthlySelector from "@/components/expenses/ExpensesMonthlySelector";
import ExpensesMonthlyOverview from "@/components/expenses/ExpensesMonthlyOverview";
import ExpensesDashboard from "@/components/expenses/ExpensesDashboard";
import EmptyExpenseState from "@/components/expenses/ExpensesEmpty";
import ExpenseLoadingState from "@/components/expenses/ExpensesLoading";
import ExpensesPagination from "@/components/expenses/ExpensesPagination";
import ExpensesBudget from "@/components/expenses/ExpensesBudget";

interface ExpenseListProps {
    expenses: Expense[];
    categories: Category[];
    isLoading: boolean;
    onExpenseSubmit: (expenseData: Partial<Expense>, expenseId?: string) => Promise<void>;
    onExpenseDelete: (id: string) => Promise<void>;
    onCategoryAdd: (categoryData: Partial<Category>) => Promise<void>;
}

const ExpensesList = ({
    expenses,
    categories,
    isLoading,
    onExpenseSubmit,
    onExpenseDelete,
    onCategoryAdd
}: ExpenseListProps) => {
    const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
    const [formType, setFormType] = useState<FormType>(null);
    const [isDashboardVisible, setIsDashboardVisible] = useState(false);
    const currentMonth = format(new Date(), "yyyy-MM");
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    // Filter expenses for selected month and sort by date
    const filteredExpenses = expenses.filter(
        (expense) => format(new Date(expense.date), "yyyy-MM") === selectedMonth
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const monthlyTotal = filteredExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
    );

    const handleFormClose = () => {
        setFormType(null);
        setSelectedExpense(undefined);
    };

    const handleExpenseEdit = (expense: Expense) => {
        setSelectedExpense(expense);
        setFormType("editExpense");
    };

    return (
        <div className="h-[calc(100vh-58px)] flex flex-col">
            <div className="flex-1 min-h-0 w-full max-w-4xl mx-auto px-4 pt-4 pb-safe flex flex-col">
                {/* Month Selection and Overview Section */}
                <div className="space-y-3 mb-4">
                    <ExpensesMonthlySelector
                        selectedMonth={selectedMonth}
                        onMonthChange={setSelectedMonth}
                    />
                    <ExpensesMonthlyOverview
                        monthlyTotal={monthlyTotal}
                        selectedMonth={selectedMonth}
                        currentMonth={currentMonth}
                        isExpanded={isDashboardVisible}
                        hasExpenses={filteredExpenses.length > 0}
                        onCurrentMonthClick={() => setSelectedMonth(currentMonth)}
                        onMonthlyTotalClick={() => setIsDashboardVisible(!isDashboardVisible)}
                    />

                    {/* Collapsible Dashboard and Budget */}
                    <div
                        className={cn(
                            "grid transition-all duration-200 ease-in-out",
                            isDashboardVisible
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0"
                        )}
                    >
                        <div className="overflow-hidden space-y-4">
                            {!isLoading && filteredExpenses.length > 0 && (
                                <>
                                    <ExpensesDashboard
                                        expenses={filteredExpenses}
                                        categories={categories}
                                    />
                                    <ExpensesBudget
                                        categories={categories}
                                        expenses={filteredExpenses}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Expenses List Section */}
                <div className="flex-1 min-h-0">
                    {isLoading ? (
                        <ExpenseLoadingState/>
                    ) : filteredExpenses.length === 0 ? (
                        <EmptyExpenseState
                            selectedMonth={selectedMonth}
                            onAddClick={() => setFormType("newExpense")}
                        />
                    ) : (
                        <ExpensesPagination
                            expenses={filteredExpenses}
                            onEdit={handleExpenseEdit}
                            onDelete={onExpenseDelete}
                        />
                    )}
                </div>
            </div>

            {/* Forms Manager */}
            <FormsManager
                formType={formType}
                onClose={handleFormClose}
                selectedExpense={selectedExpense}
                categories={categories}
                onExpenseSubmit={onExpenseSubmit}
                onCategoryAdd={onCategoryAdd}
            />

            {/* Speed Dial */}
            <SpeedDial
                onAddExpense={() => setFormType("newExpense")}
                onAddCategory={() => setFormType("newCategory")}
            />
        </div>
    );
};

export default ExpensesList;