import {useState} from "react";
import {format} from "date-fns";
import {useTranslation} from "react-i18next";
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
import ExpensesFilter from "./ExpensesFilter";
import {useExpensesFilter} from "@/hooks/useExpensesFilter";
import {Expense} from "@/types/Expense";
import ExpensesEmpty from "./ExpensesEmpty";

const ExpensesList = () => {
    const {t} = useTranslation();
    const {categories, expenses, isLoading, isInitialized} = useData();
    const operations = useDataOperations();

    const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
    const [formType, setFormType] = useState<FormType>(null);
    const [isDashboardVisible, setIsDashboardVisible] = useState(false);
    const currentMonth = format(new Date(), "yyyy-MM");
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    // Use the filter hook
    const {
        filteredExpenses,
        search,
        selectedCategoryId,
        hasActiveFilters,
        setSearch,
        setSelectedCategoryId,
        handleClearFilters
    } = useExpensesFilter({
        expenses,
        selectedMonth
    });

    if (!isInitialized || isLoading) {
        return <ExpenseLoadingState/>;
    }

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

                    <ExpensesFilter
                        categories={categories}
                        search={search}
                        selectedCategoryId={selectedCategoryId}
                        hasActiveFilters={hasActiveFilters}
                        onSearchChange={setSearch}
                        onCategoryChange={setSelectedCategoryId}
                        onClearFilters={handleClearFilters}
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
                        hasActiveFilters ? (
                            <div className="text-center py-12 px-4 rounded-lg border-2 border-dashed">
                                <p className="text-sm text-muted-foreground">
                                    {t("expenses.noExpensesMatchFilter")}
                                </p>
                            </div>
                        ) : (
                            <ExpensesEmpty
                                selectedMonth={selectedMonth}
                                onAddClick={() => setFormType("newExpense")}
                            />
                        )
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