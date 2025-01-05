import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast.ts";
import { getSession, onAuthStateChange } from "@/lib/Auth.ts";
import { supabase } from "@/lib/Supabase.ts";
import type { Session } from "@supabase/supabase-js";
import type { Category } from "@/types/Category.ts";
import type { Expense } from "@/types/Expense.ts";

export function useSession() {
    const [session, setSession] = useState<Session | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        let mounted = true;

        const initializeData = async () => {
            try {
                const { data: { session: initialSession } } = await getSession();

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
        const { data: { subscription } } = onAuthStateChange((newSession) => {
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

    return {
        session,
        categories,
        setCategories,
        expenses,
        setExpenses,
        isLoading
    };
}