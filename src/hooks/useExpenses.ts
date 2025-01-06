import { useCallback } from "react";
import { useToast } from "@/hooks/useToast.ts";
import { supabase } from "@/lib/supabase.ts";
import type { Category } from "@/types/Category.ts";
import type { Expense } from "@/types/Expense.ts";

export function useExpenses(setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>,
    setCategories: React.Dispatch<React.SetStateAction<Category[]>>) {
    const { toast } = useToast();

    const handleExpenseSubmit = useCallback(async (expenseData: Partial<Expense>, expenseId?: string): Promise<void> => {
        try {
            if (expenseId) {
                const { data, error } = await supabase
                    .from("expenses")
                    .update(expenseData)
                    .eq("id", expenseId)
                    .select(`*, category:categories(*)`)
                    .single();

                if (error) throw error;
                setExpenses(prev => prev.map(expense =>
                    expense.id === expenseId ? data : expense
                ));

                toast({
                    title: "Success",
                    description: "Expense updated successfully"
                });
            } else {
                const { data, error } = await supabase
                    .from("expenses")
                    .insert(expenseData)
                    .select(`*, category:categories(*)`)
                    .single();

                if (error) throw error;
                setExpenses(prev => [data, ...prev]);

                toast({
                    title: "Success",
                    description: "Expense added successfully"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to ${expenseId ? 'update' : 'add'} expense`,
                variant: "destructive"
            });
            throw error;
        }
    }, [setExpenses, toast]);

    const handleExpenseDelete = useCallback(async (expenseId: string): Promise<void> => {
        try {
            const { error } = await supabase
                .from("expenses")
                .delete()
                .eq("id", expenseId);

            if (error) throw error;

            setExpenses(prev => prev.filter(expense => expense.id !== expenseId));
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
    }, [setExpenses, toast]);

    const handleCategoryAdd = useCallback(async (categoryData: Partial<Category>): Promise<void> => {
        try {
            const { error: insertError } = await supabase
                .from("categories")
                .insert(categoryData);

            if (insertError) throw insertError;

            const { data: updatedCategories, error: fetchError } = await supabase
                .from('categories')
                .select('*')
                .order('name', { ascending: true });

            if (fetchError) throw fetchError;

            setCategories(updatedCategories);
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
    }, [setCategories, toast]);

    return {
        handleExpenseSubmit,
        handleExpenseDelete,
        handleCategoryAdd,
    };
}