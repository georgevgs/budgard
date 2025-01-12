import {useState} from "react";
import {format} from "date-fns";
import type {FormType} from "@/components/layout/FormsManager";
import {useData} from "@/contexts/DataContext";
import {useDataOperations} from "@/hooks/useDataOperations";
import {cn} from "@/lib/utils";
import FormsManager from "@/components/layout/FormsManager";
import SpeedDial from "@/components/layout/SpeedDial";
import ExpensesMonthlySelector from "./ExpensesMonthlySelector";
import ExpensesMonthlyOverview from "./ExpensesMonthlyOverview";
import ExpensesDashboard from "./ExpensesDashboard";
import ExpensesBudget from "./ExpensesBudget";
import ExpenseLoadingState from "./ExpensesLoading";
import ExpensesPagination from "./ExpensesPagination";
import {Expense} from "@/types/Expense.ts";
import ExpensesEmpty from "./ExpensesEmpty";

const ExpensesList = () => {
    const {categories, expenses, isLoading, isInitialized} = useData();
    const operations = useDataOperations();

    const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
    const [formType, setFormType] = useState<FormType>(null);
    const [isDashboardVisible, setIsDashboardVisible] = useState(false);
    const currentMonth = format(new Date(), "yyyy-MM");
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    if (!isInitialized || isLoading) {
        return <ExpenseLoadingState/>;
    }

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
        <div className="flex flex-col min-h-[calc(100vh-58px)]">
            <div className="flex-1 container max-w-4xl mx-auto px-4 pt-4 pb-4">
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
                            {filteredExpenses.length > 0 && (
                                <>
                                    <ExpensesDashboard
                                        expenses={filteredExpenses}
                                        categories={categories}
                                    />
                                    <ExpensesBudget/>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Expenses List Section */}
                <div className="flex-1">
                    {filteredExpenses.length === 0 ? (
                        <ExpensesEmpty
                            selectedMonth={selectedMonth}
                            onAddClick={() => setFormType("newExpense")}
                        />
                    ) : (
                        <ExpensesPagination
                            expenses={filteredExpenses}
                            onEdit={handleExpenseEdit}
                            onDelete={operations.handleExpenseDelete}
                        />
                    )}
                </div>
            </div>

            {/* Forms Manager */}
            <FormsManager
                formType={formType}
                onClose={handleFormClose}
                selectedExpense={selectedExpense}
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