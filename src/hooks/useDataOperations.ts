import {useCallback} from "react";
import {useToast} from "@/hooks/useToast";
import {dataService} from "@/services/dataService";
import {useData} from "@/contexts/DataContext";
import type {Category} from "@/types/Category";
import type {Expense} from "@/types/Expense";
import type {Budget} from "@/types/Budget";
import {invalidateQuery} from "@/lib/queryUtils";

export function useDataOperations() {
    const {
        refreshData,
        updateOptimistically,
        revertOptimisticUpdate,
        expenses,
        isInitialized
    } = useData();
    const {toast} = useToast();

    const handleExpenseSubmit = useCallback(
        async (expenseData: Partial<Expense>, expenseId?: string) => {
            if (!isInitialized) return;

            try {
                const optimisticExpense = {
                    ...expenseData,
                    id: expenseId || `temp-${Date.now()}`,
                    created_at: new Date().toISOString(),
                } as Expense;

                const updatedExpenses = expenseId
                    ? expenses.map(e => e.id === expenseId ? {...e, ...optimisticExpense} : e)
                    : [optimisticExpense, ...expenses];

                updateOptimistically("expenses", updatedExpenses);

                if (expenseId) {
                    await dataService.updateExpense(expenseData, expenseId);
                } else {
                    await dataService.createExpense(expenseData);
                }

                invalidateQuery("expenses");
                await refreshData();

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
        [refreshData, updateOptimistically, revertOptimisticUpdate, toast, expenses, isInitialized]
    );

    const handleExpenseDelete = useCallback(
        async (expenseId: string) => {
            if (!isInitialized) return;

            try {
                const updatedExpenses = expenses.filter(e => e.id !== expenseId);
                updateOptimistically("expenses", updatedExpenses);

                await dataService.deleteExpense(expenseId);
                invalidateQuery("expenses");
                await refreshData();

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
        [refreshData, updateOptimistically, revertOptimisticUpdate, toast, expenses, isInitialized]
    );

    const handleCategoryAdd = useCallback(
        async (categoryData: Partial<Category>) => {
            if (!isInitialized) return;

            try {
                await dataService.createCategory(categoryData);
                invalidateQuery("categories");
                await refreshData();

                toast({
                    title: "Success",
                    description: "Category added successfully",
                });
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to add category",
                    variant: "destructive",
                });
                throw error;
            }
        },
        [refreshData, toast, isInitialized]
    );

    const handleBudgetUpdate = useCallback(
        async (budgetData: Partial<Budget> & { user_id: string }) => {
            if (!isInitialized) return false;

            try {
                await dataService.updateBudget(budgetData);
                invalidateQuery("budget");
                await refreshData();

                toast({
                    title: "Success",
                    description: "Budget updated successfully",
                });
                return true;
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to update budget",
                    variant: "destructive",
                });
                return false;
            }
        },
        [refreshData, toast, isInitialized]
    );

    return {
        handleExpenseSubmit,
        handleExpenseDelete,
        handleCategoryAdd,
        handleBudgetUpdate,
    };
}