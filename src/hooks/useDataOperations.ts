import {useCallback} from "react";
import {useToast} from "@/hooks/useToast";
import {dataService} from "@/services/dataService";
import {useData} from "@/contexts/DataContext";
import type {Category} from "@/types/Category";
import type {Expense} from "@/types/Expense";
import type {Budget} from "@/types/Budget";
import {RecurringExpense} from "@/types/RecurringExpense.ts";

export function useDataOperations() {
    const {
        expenses,
        categories,
        recurringExpenses,
        isInitialized,
        updateOptimistically,
        revertOptimisticUpdate,
    } = useData();
    const {toast} = useToast();

    const showErrorToast = (message: string) => {
        toast({
            variant: "destructive",
            description: message,
            className: "border-2 border-destructive bg-destructive/5",
        });
    };

    const handleExpenseSubmit = useCallback(
        async (expenseData: Partial<Expense>, expenseId?: string) => {
            if (!isInitialized) return;

            try {
                const optimisticExpense = {
                    ...expenseData,
                    id: expenseId || `temp-${Date.now()}`,
                    created_at: new Date().toISOString(),
                    category: expenseData.category_id
                        ? categories.find(c => c.id === expenseData.category_id)
                        : undefined
                } as Expense;

                const updatedExpenses = expenseId
                    ? expenses.map(e => e.id === expenseId ? {...e, ...optimisticExpense} : e)
                    : [optimisticExpense, ...expenses];

                updateOptimistically("expenses", updatedExpenses);

                const savedExpense = expenseId
                    ? await dataService.updateExpense(expenseData, expenseId)
                    : await dataService.createExpense(expenseData);

                const finalExpenses = expenseId
                    ? expenses.map(e => e.id === expenseId ? savedExpense : e)
                    : [savedExpense, ...expenses.filter(e => e.id !== optimisticExpense.id)];

                updateOptimistically("expenses", finalExpenses);
            } catch (error) {
                revertOptimisticUpdate();
                showErrorToast(`Failed to ${expenseId ? "update" : "add"} expense`);
                throw error;
            }
        },
        [categories, expenses, isInitialized, updateOptimistically, revertOptimisticUpdate]
    );

    const handleExpenseDelete = useCallback(
        async (expenseId: string) => {
            if (!isInitialized) return;

            try {
                const updatedExpenses = expenses.filter(e => e.id !== expenseId);
                updateOptimistically("expenses", updatedExpenses);
                await dataService.deleteExpense(expenseId);
            } catch (error) {
                revertOptimisticUpdate();
                showErrorToast("Failed to delete expense");
                throw error;
            }
        },
        [expenses, isInitialized, updateOptimistically, revertOptimisticUpdate]
    );

    const handleCategoryAdd = useCallback(
        async (categoryData: Partial<Category>) => {
            if (!isInitialized) return;

            try {
                const optimisticCategory = {
                    ...categoryData,
                    id: `temp-${Date.now()}`,
                    created_at: new Date().toISOString(),
                } as Category;

                const updatedCategories = [...categories, optimisticCategory];
                updateOptimistically("categories", updatedCategories);

                const savedCategory = await dataService.createCategory(categoryData);
                const finalCategories = [...categories, savedCategory].sort((a, b) =>
                    a.name.localeCompare(b.name)
                );

                updateOptimistically("categories", finalCategories);
            } catch (error) {
                revertOptimisticUpdate();
                showErrorToast("Failed to add category");
                throw error;
            }
        },
        [categories, isInitialized, updateOptimistically, revertOptimisticUpdate]
    );

    const handleBudgetUpdate = useCallback(
        async (budgetData: Partial<Budget> & { user_id: string }) => {
            if (!isInitialized) return false;

            try {
                const optimisticBudget = {
                    ...budgetData,
                    id: budgetData.id || `temp-${Date.now()}`,
                } as Budget;

                updateOptimistically("budget", optimisticBudget);
                const savedBudget = await dataService.updateBudget(budgetData);
                updateOptimistically("budget", savedBudget);
                return true;
            } catch (error) {
                revertOptimisticUpdate();
                showErrorToast("Failed to update budget");
                return false;
            }
        },
        [isInitialized, updateOptimistically, revertOptimisticUpdate]
    );

    const handleRecurringExpenseSubmit = useCallback(
        async (expenseData: Partial<RecurringExpense>, expenseId?: string) => {
            if (!isInitialized) return;

            try {
                const optimisticExpense = {
                    ...expenseData,
                    id: expenseId || `temp-${Date.now()}`,
                    created_at: new Date().toISOString(),
                    active: true,
                    category: expenseData.category_id
                        ? categories.find(c => c.id === expenseData.category_id)
                        : undefined
                } as RecurringExpense;

                const updatedExpenses = expenseId
                    ? recurringExpenses.map(e => e.id === expenseId ? {...e, ...optimisticExpense} : e)
                    : [optimisticExpense, ...recurringExpenses];

                updateOptimistically("recurringExpenses", updatedExpenses);

                const savedExpense = expenseId
                    ? await dataService.updateRecurringExpense(expenseData, expenseId)
                    : await dataService.createRecurringExpense(expenseData);

                const finalExpenses = expenseId
                    ? recurringExpenses.map(e => e.id === expenseId ? savedExpense : e)
                    : [savedExpense, ...recurringExpenses.filter(e => e.id !== optimisticExpense.id)];

                updateOptimistically("recurringExpenses", finalExpenses);
            } catch (error) {
                revertOptimisticUpdate();
                showErrorToast(`Failed to ${expenseId ? "update" : "add"} recurring expense`);
                throw error;
            }
        },
        [categories, recurringExpenses, isInitialized, updateOptimistically, revertOptimisticUpdate]
    );

    const handleRecurringExpenseDelete = useCallback(
        async (expenseId: string) => {
            if (!isInitialized) return;

            try {
                const updatedExpenses = recurringExpenses.filter(e => e.id !== expenseId);
                updateOptimistically("recurringExpenses", updatedExpenses);
                await dataService.deleteRecurringExpense(expenseId);
            } catch (error) {
                revertOptimisticUpdate();
                showErrorToast("Failed to delete recurring expense");
                throw error;
            }
        },
        [recurringExpenses, isInitialized, updateOptimistically, revertOptimisticUpdate]
    );

    const handleRecurringExpenseToggle = useCallback(
        async (expenseId: string, active: boolean) => {
            if (!isInitialized) return;

            try {
                const updatedExpenses = recurringExpenses.map(e =>
                    e.id === expenseId ? {...e, active} : e
                );
                updateOptimistically("recurringExpenses", updatedExpenses);
                await dataService.toggleRecurringExpense(expenseId, active);
            } catch (error) {
                revertOptimisticUpdate();
                showErrorToast("Failed to update recurring expense status");
                throw error;
            }
        },
        [recurringExpenses, isInitialized, updateOptimistically, revertOptimisticUpdate]
    );

    return {
        handleExpenseSubmit,
        handleExpenseDelete,
        handleCategoryAdd,
        handleBudgetUpdate,
        handleRecurringExpenseSubmit,
        handleRecurringExpenseDelete,
        handleRecurringExpenseToggle,
    };
}