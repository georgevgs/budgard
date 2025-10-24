import {supabase} from "@/lib/supabase";
import type {Category} from "@/types/Category";
import type {Expense} from "@/types/Expense";
import type {RecurringExpense} from "@/types/RecurringExpense";

export const QueryKeys = {
    USER: "user",
    CATEGORIES: "categories",
    EXPENSES: "expenses",
    BUDGET: "budget",
    RECURRING_EXPENSES: "recurring-expenses",
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
            .select(`
               *,
               category:categories(*),
               recurring_expense:recurring_expenses(*)
           `)
            .order("date", {ascending: false})
            .order("created_at", {ascending: false});

        if (error) throw error;
        return data as (Expense & { recurring_expense: RecurringExpense | null })[];
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

    async getRecurringExpenses() {
        const {data, error} = await supabase
            .from("recurring_expenses")
            .select(`
               *,
               category:categories(*),
               expenses:expenses(*)
           `)
            .order("created_at", {ascending: false});

        if (error) throw error;
        return data as (RecurringExpense & { expenses: Expense[] })[];
    },

    async createRecurringExpense(expenseData: Partial<RecurringExpense>) {
        const {data, error} = await supabase
            .from("recurring_expenses")
            .insert(expenseData)
            .select(`*, category:categories(*)`)
            .single();

        if (error) throw error;
        return data as RecurringExpense;
    },

    async updateRecurringExpense(expenseData: Partial<RecurringExpense>, expenseId: string) {
        const {data, error} = await supabase
            .from("recurring_expenses")
            .update(expenseData)
            .eq("id", expenseId)
            .select(`*, category:categories(*)`)
            .single();

        if (error) throw error;
        return data as RecurringExpense;
    },

    async deleteRecurringExpense(expenseId: string) {
        const {error} = await supabase
            .from("recurring_expenses")
            .delete()
            .eq("id", expenseId);

        if (error) throw error;
    },

    async toggleRecurringExpense(expenseId: string, active: boolean) {
        const {data, error} = await supabase
            .from("recurring_expenses")
            .update({active})
            .eq("id", expenseId)
            .select(`*, category:categories(*)`)
            .single();

        if (error) throw error;
        return data as RecurringExpense;
    }
};
