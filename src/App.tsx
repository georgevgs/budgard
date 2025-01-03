import { useState, useEffect, useCallback } from "react";
import LandingPage from "@/pages/landing-page";
import ExpenseList from "@/components/expenses/expense-list";
import Header from "@/components/layout/header";
import { Toaster } from "@/components/ui/toaster";
import { getSession, onAuthStateChange } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { Session } from "@supabase/supabase-js";
import type { Category } from "@/types/category";
import type { Expense } from "@/types/expense";

const App = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    // Initial data load
    useEffect(() => {
        let mounted = true;

        const initializeData = async () => {
            try {
                const { data: { session: initialSession }} = await getSession();

                if (!mounted) return;

                setSession(initialSession);

                if (initialSession) {
                    setIsLoading(true);

                    // Parallel data fetching
                    const [categoriesResponse, expensesResponse] = await Promise.all([
                        supabase.from('categories').select('*').order('name'),
                        supabase.from("expenses")
                            .select(`*, category:categories(*)`)
                            .order("date", { ascending: false })
                    ]);

                    if (!mounted) return;

                    if (categoriesResponse.error) throw categoriesResponse.error;
                    if (expensesResponse.error) throw expensesResponse.error;

                    setCategories(categoriesResponse.data || []);
                    setExpenses(expensesResponse.data || []);
                }
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to load initial data",
                    variant: "destructive",
                });
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        initializeData();

        // Auth state listener
        const { data: { subscription }} = onAuthStateChange((newSession) => {
            if (!mounted) return;
            setSession(newSession);
            if (!newSession) {
                setCategories([]);
                setExpenses([]);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [toast]);

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
    }, [toast]);

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
    }, [toast]);

    const handleCategoryAdd = useCallback(async (categoryData: Partial<Category>): Promise<void> => {
        try {
            const { data, error } = await supabase
                .from("categories")
                .insert(categoryData)
                .select()
                .single();

            if (error) throw error;

            setCategories(prev => [...prev, data]);
            toast({
                title: "Success",
                description: "Category added successfully"
            });

            return data;
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to add category",
                variant: "destructive"
            });
            throw error;
        }
    }, [toast]);

    if (!session) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <main className="flex-1">
                    <LandingPage />
                </main>
                <Toaster />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <main className="flex-1">
                <div className="container mx-auto">
                    <ExpenseList
                        expenses={expenses}
                        categories={categories}
                        isLoading={isLoading}
                        onExpenseSubmit={handleExpenseSubmit}
                        onExpenseDelete={handleExpenseDelete}
                        onCategoryAdd={handleCategoryAdd}
                    />
                </div>
            </main>
            <Toaster />
        </div>
    );
};

export default App;