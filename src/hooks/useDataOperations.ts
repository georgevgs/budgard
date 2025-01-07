import {useCallback} from "react";
import {useToast} from "@/hooks/useToast";
import {dataService} from "@/services/dataService";
import {useData} from "@/contexts/DataContext";
import type {Category} from "@/types/Category";
import type {Expense} from "@/types/Expense";
import type {Budget} from "@/types/Budget";

export function useDataOperations() {
    const {
        expenses,
        categories,
        isInitialized,
        updateOptimistically,
        revertOptimisticUpdate,
    } = useData();
    const {toast} = useToast();

    const handleExpenseSubmit = useCallback(
        async (expenseData: Partial<Expense>, expenseId?: string) => {
            if (!isInitialized) return;

            try {
                // Create optimistic expense
                const optimisticExpense = {
                    ...expenseData,
                    id: expenseId || `temp-${Date.now()}`,
                    created_at: new Date().toISOString(),
                    // Add category data if category_id is provided
                    category: expenseData.category_id
                        ? categories.find(c => c.id === expenseData.category_id)
                        : undefined
                } as Expense;

                // Update local state optimistically
                const updatedExpenses = expenseId
                    ? expenses.map(e => e.id === expenseId ? {...e, ...optimisticExpense} : e)
                    : [optimisticExpense, ...expenses];

                updateOptimistically("expenses", updatedExpenses);

                // Perform server operation
                const savedExpense = expenseId
                    ? await dataService.updateExpense(expenseData, expenseId)
                    : await dataService.createExpense(expenseData);

                // Update with actual server data
                const finalExpenses = expenseId
                    ? expenses.map(e => e.id === expenseId ? savedExpense : e)
                    : [savedExpense, ...expenses.filter(e => e.id !== optimisticExpense.id)];

                updateOptimistically("expenses", finalExpenses);

                toast({
                    title: "Success",
                    description: `Expense ${expenseId ? "updated" : "added"} successfully`,
                });
            } catch (error) {
                revertOptimisticUpdate();
                toast({
                    title: "Error",
                    description: `Failed to ${expenseId ? "update" : "add"} expense`,
                    variant: "destructive",
                });
                throw error;
            }
        },
        [categories, expenses, isInitialized, updateOptimistically, revertOptimisticUpdate, toast]
    );

    const handleExpenseDelete = useCallback(
        async (expenseId: string) => {
            if (!isInitialized) return;

            try {
                const updatedExpenses = expenses.filter(e => e.id !== expenseId);
                updateOptimistically("expenses", updatedExpenses);

                await dataService.deleteExpense(expenseId);

                toast({
                    title: "Success",
                    description: "Expense deleted successfully",
                });
            } catch (error) {
                revertOptimisticUpdate();
                toast({
                    title: "Error",
                    description: "Failed to delete expense",
                    variant: "destructive",
                });
                throw error;
            }
        },
        [expenses, isInitialized, updateOptimistically, revertOptimisticUpdate, toast]
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

                // Update with actual server data
                const finalCategories = [...categories, savedCategory].sort((a, b) =>
                    a.name.localeCompare(b.name)
                );
                updateOptimistically("categories", finalCategories);

                toast({
                    title: "Success",
                    description: "Category added successfully",
                });
            } catch (error) {
                revertOptimisticUpdate();
                toast({
                    title: "Error",
                    description: "Failed to add category",
                    variant: "destructive",
                });
                throw error;
            }
        },
        [categories, isInitialized, updateOptimistically, revertOptimisticUpdate, toast]
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

                toast({
                    title: "Success",
                    description: "Budget updated successfully",
                });
                return true;
            } catch (error) {
                revertOptimisticUpdate();
                toast({
                    title: "Error",
                    description: "Failed to update budget",
                    variant: "destructive",
                });
                return false;
            }
        },
        [isInitialized, updateOptimistically, revertOptimisticUpdate, toast]
    );

    return {
        handleExpenseSubmit,
        handleExpenseDelete,
        handleCategoryAdd,
        handleBudgetUpdate,
    };
}