import {supabase} from "@/lib/supabase";
import type {Category} from "@/types/Category";
import type {Expense} from "@/types/Expense";
import type {Budget} from "@/types/Budget";

export const QueryKeys = {
    USER: "user",
    CATEGORIES: "categories",
    EXPENSES: "expenses",
    BUDGET: "budget",
} as const;

export const dataService = {
    async getUser() {
        const {data: {user}, error} = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    },

    async getCategories() {
        const {data, error} = await supabase
            .from("categories")
            .select("*")
            .order("name");

        if (error) throw error;
        return data as Category[];
    },

    async getExpenses() {
        const {data, error} = await supabase
            .from("expenses")
            .select(`*, category:categories(*)`)
            .order("date", {ascending: false});

        if (error) throw error;
        return data as Expense[];
    },

    async getBudget(userId: string) {
        const {data, error} = await supabase
            .from("budgets")
            .select()
            .eq("user_id", userId)
            .single();

        if (error && error.code !== "PGRST116") throw error;
        return data as Budget | null;
    },

    async updateExpense(expenseData: Partial<Expense>, expenseId: string) {
        const {data, error} = await supabase
            .from("expenses")
            .update(expenseData)
            .eq("id", expenseId)
            .select(`*, category:categories(*)`)
            .single();

        if (error) throw error;
        return data as Expense;
    },

    async createExpense(expenseData: Partial<Expense>) {
        const {data, error} = await supabase
            .from("expenses")
            .insert(expenseData)
            .select(`*, category:categories(*)`)
            .single();

        if (error) throw error;
        return data as Expense;
    },

    async deleteExpense(expenseId: string) {
        const {error} = await supabase
            .from("expenses")
            .delete()
            .eq("id", expenseId);

        if (error) throw error;
    },

    async createCategory(categoryData: Partial<Category>) {
        const {data, error} = await supabase
            .from("categories")
            .insert(categoryData)
            .select()
            .single();

        if (error) throw error;
        return data as Category;
    },

    async updateBudget(budgetData: Partial<Budget> & { user_id: string }) {
        const {data, error} = await supabase
            .from("budgets")
            .upsert(budgetData)
            .select()
            .single();

        if (error) throw error;
        return data as Budget;
    }
};