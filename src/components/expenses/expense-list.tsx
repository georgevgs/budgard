import { useState } from "react";
import { format } from "date-fns";
import type { Expense } from "@/types/expense";
import type { Category } from "@/types/category";
import ExpenseHeader from "./expense-header";
import MonthlyOverview from "./expense-monthly-overview";
import ExpenseLoadingState from "./expense-loading";
import EmptyExpenseState from "./expense-empty";
import PaginatedExpenseGrid from "./paginated-expense-grid";
import ExpenseForm from "./expense-form";
import MonthSelector from "@/components/expenses/expense-month-selector";
import ExpensesDashboard from "@/components/expenses/ExpensesDashboard";
import { cn } from "@/lib/utils";

interface ExpenseListProps {
    expenses: Expense[];
    categories: Category[];
    isLoading: boolean;
    onExpenseSubmit: (expenseData: Partial<Expense>, expenseId?: string) => Promise<void>;
    onExpenseDelete: (id: string) => Promise<void>;
    onCategoryAdd: (categoryData: Partial<Category>) => Promise<void>;
}

const ExpenseList = ({
    expenses,
    categories,
    isLoading,
    onExpenseSubmit,
    onExpenseDelete,
    onCategoryAdd
}: ExpenseListProps) => {
    const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
    const [showForm, setShowForm] = useState(false);
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
        setShowForm(false);
        setSelectedExpense(undefined);
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
            <ExpenseHeader onAddClick={() => setShowForm(true)} />

            <div className="space-y-4">
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

                {/* Dashboard Section with Animation */}
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

            {/* Expense List Section */}
            <div className="space-y-4">
                {isLoading ? (
                    <ExpenseLoadingState />
                ) : filteredExpenses.length === 0 ? (
                    <EmptyExpenseState
                        selectedMonth={selectedMonth}
                        onAddClick={() => setShowForm(true)}
                    />
                ) : (
                    <PaginatedExpenseGrid
                        expenses={filteredExpenses}
                        onEdit={(expense) => {
                            setSelectedExpense(expense);
                            setShowForm(true);
                        }}
                        onDelete={onExpenseDelete}
                    />
                )}
            </div>

            <ExpenseForm
                open={showForm}
                onClose={handleFormClose}
                expense={selectedExpense}
                onSubmit={onExpenseSubmit}
                categories={categories}
                onCategoryAdd={onCategoryAdd}
            />
        </div>
    );
};

export default ExpenseList;