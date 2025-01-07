import {useState, useEffect} from "react";
import {supabase} from "@/lib/supabase";
import {useToast} from "@/hooks/useToast";
import type {Category} from "@/types/Category";
import type {Expense} from "@/types/Expense";

interface CategoriesState {
    categories: Category[];
    setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
    isLoading: boolean;
}

interface ExpensesState {
    expenses: Expense[];
    setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
    isLoading: boolean;
}

interface AppDataState extends Omit<CategoriesState, "isLoading">,
    Omit<ExpensesState, "isLoading"> {
    isLoading: boolean;
}

// Categories Hook
export function useCategories(isAuthenticated: boolean): CategoriesState {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const {toast} = useToast();

    useEffect(() => {
        let mounted = true;

        const fetchCategories = async () => {
            if (!isAuthenticated) {
                setCategories([]);
                setIsLoading(false);
                return;
            }

            try {
                const {data, error} = await supabase
                    .from("categories")
                    .select("*")
                    .order("name");

                if (!mounted) return;
                if (error) throw error;

                setCategories(data || []);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to load categories",
                    variant: "destructive"
                });
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchCategories();

        return () => {
            mounted = false;
        };
    }, [isAuthenticated, toast]);

    return {
        categories,
        setCategories,
        isLoading
    };
}

// Expenses Hook
export function useExpensesList(isAuthenticated: boolean): ExpensesState {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const {toast} = useToast();

    useEffect(() => {
        let mounted = true;

        const fetchExpenses = async () => {
            if (!isAuthenticated) {
                setExpenses([]);
                setIsLoading(false);
                return;
            }

            try {
                const {data, error} = await supabase
                    .from("expenses")
                    .select(`*, category:categories(*)`)
                    .order("date", {ascending: false});

                if (!mounted) return;
                if (error) throw error;

                setExpenses(data || []);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to load expenses",
                    variant: "destructive"
                });
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchExpenses();

        return () => {
            mounted = false;
        };
    }, [isAuthenticated, toast]);

    return {
        expenses,
        setExpenses,
        isLoading
    };
}

// Combined Data Hook
export function useAppData(isAuthenticated: boolean): AppDataState {
    const {
        categories,
        setCategories,
        isLoading: categoriesLoading
    } = useCategories(isAuthenticated);

    const {
        expenses,
        setExpenses,
        isLoading: expensesLoading
    } = useExpensesList(isAuthenticated);

    return {
        categories,
        setCategories,
        expenses,
        setExpenses,
        isLoading: categoriesLoading || expensesLoading
    };
}