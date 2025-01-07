import {useCallback} from "react";
import {useQuery, generateQueryKey, invalidateQuery} from "@/lib/queryUtils";
import {dataService, QueryKeys} from "@/services/dataService";
import {useToast} from "@/hooks/useToast";
import type {Category} from "@/types/Category";
import type {Expense} from "@/types/Expense";
import type {Budget} from "@/types/Budget";
import {Session} from "@supabase/supabase-js";
import {useAuth} from "@/hooks/useAuth.ts";

// Data Query Hooks
export function useCategories(isAuthenticated: boolean) {
    return useQuery<Category[]>(
        QueryKeys.CATEGORIES,
        () => dataService.getCategories(),
        isAuthenticated
    );
}

export function useExpenses(isAuthenticated: boolean) {
    return useQuery<Expense[]>(
        QueryKeys.EXPENSES,
        () => dataService.getExpenses(),
        isAuthenticated
    );
}

export function useBudget(isAuthenticated: boolean, userId?: string) {
    const queryKey = generateQueryKey(QueryKeys.BUDGET, {userId});
    return useQuery<Budget | null>(
        queryKey,
        () => (userId ? dataService.getBudget(userId) : Promise.resolve(null)),
        isAuthenticated && !!userId,
        [userId]
    );
}

// Data Operations Hooks
export interface DataOperations {
    handleExpenseSubmit: (expenseData: Partial<Expense>, expenseId?: string) => Promise<void>;
    handleExpenseDelete: (id: string) => Promise<void>;
    handleCategoryAdd: (categoryData: Partial<Category>) => Promise<void>;
    handleBudgetUpdate: (budgetData: Partial<Budget> & { user_id: string }) => Promise<boolean>;
}

export function useDataOperations(): DataOperations {
    const {toast} = useToast();

    const handleExpenseSubmit = useCallback(
        async (expenseData: Partial<Expense>, expenseId?: string) => {
            try {
                if (expenseId) {
                    await dataService.updateExpense(expenseData, expenseId);
                } else {
                    await dataService.createExpense(expenseData);
                }

                invalidateQuery(QueryKeys.EXPENSES);
                toast({
                    title: "Success",
                    description: `Expense ${expenseId ? "updated" : "added"} successfully`
                });
            } catch (error) {
                toast({
                    title: "Error",
                    description: `Failed to ${expenseId ? "update" : "add"} expense`,
                    variant: "destructive"
                });
                throw error;
            }
        },
        [toast]
    );

    const handleExpenseDelete = useCallback(
        async (expenseId: string) => {
            try {
                await dataService.deleteExpense(expenseId);
                invalidateQuery(QueryKeys.EXPENSES);
                toast({
                    title: "Success",
                    description: "Expense deleted successfully"
                });
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to delete expense",
                    variant: "destructive"
                });
                throw error;
            }
        },
        [toast]
    );

    const handleCategoryAdd = useCallback(
        async (categoryData: Partial<Category>) => {
            try {
                await dataService.createCategory(categoryData);
                invalidateQuery(QueryKeys.CATEGORIES);
                toast({
                    title: "Success",
                    description: "Category added successfully"
                });
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to add category",
                    variant: "destructive"
                });
                throw error;
            }
        },
        [toast]
    );

    const handleBudgetUpdate = useCallback(
        async (budgetData: Partial<Budget> & { user_id: string }) => {
            try {
                if (!budgetData.user_id) {
                    throw new Error("User ID is required");
                }

                await dataService.updateBudget(budgetData);
                invalidateQuery(generateQueryKey(QueryKeys.BUDGET, {userId: budgetData.user_id}));
                toast({
                    title: "Success",
                    description: "Budget updated successfully"
                });
                return true;
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to update budget",
                    variant: "destructive"
                });
                return false;
            }
        },
        [toast]
    );

    return {
        handleExpenseSubmit,
        handleExpenseDelete,
        handleCategoryAdd,
        handleBudgetUpdate
    };
}

interface AppData {
    categories: Category[];
    expenses: Expense[];
    budget: Budget | null;
    session: Session | null;
    isLoading: boolean;
    operations: DataOperations;
}

export function useAppData(isAuthenticated: boolean, userId?: string): AppData {
    const {session} = useAuth();

    const {
        data: categories,
        isLoading: categoriesLoading
    } = useCategories(isAuthenticated && !!session);

    const {
        data: expenses,
        isLoading: expensesLoading
    } = useExpenses(isAuthenticated && !!session);

    const {
        data: budget,
        isLoading: budgetLoading
    } = useBudget(isAuthenticated && !!session, userId);

    const operations = useDataOperations();

    return {
        categories: categories || [],
        expenses: expenses || [],
        budget,
        session,
        isLoading: categoriesLoading || expensesLoading || budgetLoading,
        operations
    };
}