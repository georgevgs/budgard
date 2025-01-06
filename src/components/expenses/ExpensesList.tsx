import { useState } from "react";
import { format } from "date-fns";
import type { Expense } from "@/types/Expense.ts";
import type { Category } from "@/types/Category.ts";
import MonthlyOverview from "./ExpensesMonthlyOverview";
import ExpenseLoadingState from "./ExpensesLoading";
import EmptyExpenseState from "./ExpensesEmpty";
import ExpensesPaginationGrid from "./ExpensesPaginationGrid";
import MonthSelector from "@/components/expenses/ExpensesMonthlySelector";
import ExpensesDashboard from "@/components/expenses/ExpensesDashboard";
import { cn } from "@/lib/utils.ts";
import FormsManager, { FormType } from "@/components/layout/FormsManager";
import SpeedDial from "@/components/layout/SpeedDial";

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

    return (
        <div className="h-[calc(100vh-58px)] flex flex-col">
            <div className="flex-1 min-h-0 w-full max-w-4xl mx-auto px-4 pt-4 pb-safe flex flex-col">
                <div className="space-y-3 mt-2">
                    <MonthSelector
                        selectedMonth={selectedMonth}
                        onMonthChange={setSelectedMonth}
                    />
                    <MonthlyOverview
                        monthlyTotal={monthlyTotal}
                        selectedMonth={selectedMonth}
                        currentMonth={currentMonth}
                        isExpanded={isDashboardVisible}
                        hasExpenses={filteredExpenses.length > 0}
                        onCurrentMonthClick={() => setSelectedMonth(currentMonth)}
                        onMonthlyTotalClick={() => setIsDashboardVisible(!isDashboardVisible)}
                    />

                    <div
                        className={cn(
                            "grid transition-all duration-200 ease-in-out",
                            isDashboardVisible
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0"
                        )}
                    >
                        <div className="overflow-hidden">
                            {!isLoading && filteredExpenses.length > 0 && (
                                <ExpensesDashboard
                                    expenses={filteredExpenses}
                                    categories={categories}
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex-1 min-h-0">
                    {isLoading ? (
                        <ExpenseLoadingState />
                    ) : filteredExpenses.length === 0 ? (
                        <EmptyExpenseState
                            selectedMonth={selectedMonth}
                            onAddClick={() => setFormType('newExpense')}
                        />
                    ) : (
                        <ExpensesPaginationGrid
                            expenses={filteredExpenses}
                            onEdit={(expense) => {
                                setSelectedExpense(expense);
                                setFormType('editExpense');
                            }}
                            onDelete={onExpenseDelete}
                        />
                    )}
                </div>
            </div>

            <FormsManager
                formType={formType}
                onClose={handleFormClose}
                selectedExpense={selectedExpense}
                categories={categories}
                onExpenseSubmit={onExpenseSubmit}
                onCategoryAdd={onCategoryAdd}
            />

            <SpeedDial
                onAddExpense={() => setFormType('newExpense')}
                onAddCategory={() => setFormType('newCategory')}
            />
        </div>
    );
};

export default ExpensesList;