import { useState } from "react";
import { format } from "date-fns";
import type { Expense } from "@/types/Expense.ts";
import type { Category } from "@/types/Category.ts";
import MonthlyOverview from "./ExpensesMonthlyOverview.tsx";
import ExpenseLoadingState from "./ExpensesLoading.tsx";
import EmptyExpenseState from "./ExpensesEmpty.tsx";
import ExpensesPaginationGrid from "./ExpensesPaginationGrid.tsx";
import MonthSelector from "@/components/expenses/ExpensesMonthlySelector.tsx";
import ExpensesDashboard from "@/components/expenses/ExpensesDashboard";
import { cn } from "@/lib/utils.ts";
import FormsManager, {FormType} from "@/components/layout/FormsManager.tsx";
import SpeedDial from "@/components/layout/SpeedDial.tsx";

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
        <>
            <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
                    <p className="text-sm text-muted-foreground">
                        Track and manage your expenses
                    </p>
                </div>

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

                <FormsManager
                    formType={formType}
                    onClose={handleFormClose}
                    selectedExpense={selectedExpense}
                    categories={categories}
                    onExpenseSubmit={onExpenseSubmit}
                    onCategoryAdd={onCategoryAdd}
                />
            </div>

            <SpeedDial
                onAddExpense={() => setFormType('newExpense')}
                onAddCategory={() => setFormType('newCategory')}
            />
        </>
    );
};

export default ExpensesList;