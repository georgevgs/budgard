import {createContext, useContext, useState, useEffect, ReactNode, useCallback} from "react";
import {useAuth} from "./AuthContext";
import {dataService} from "@/services/dataService";
import type {Category} from "@/types/Category";
import type {Expense} from "@/types/Expense";
import type {RecurringExpense} from "@/types/RecurringExpense";
import {useToast} from "@/hooks/useToast";

interface DataState {
    categories: Category[];
    expenses: Expense[];
    recurringExpenses: RecurringExpense[];
    isLoading: boolean;
    isInitialized: boolean;
}

interface DataContextType extends DataState {
    refreshData: () => Promise<void>;
    setCategories: (categories: Category[]) => void;
    setExpenses: (expenses: Expense[]) => void;
    setRecurringExpenses: (recurringExpenses: RecurringExpense[]) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({children}: {children: ReactNode}) {
    const {session, isLoading: isAuthLoading} = useAuth();
    const {toast} = useToast();
    
    const [categories, setCategories] = useState<Category[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    const fetchData = useCallback(async () => {
        if (!session?.user?.id) {
            return;
        }

        setIsLoading(true);

        try {
            const [categoriesData, expensesData, recurringExpensesData] = await Promise.all([
                dataService.getCategories(),
                dataService.getExpenses(),
                dataService.getRecurringExpenses(),
            ]);

            setCategories(categoriesData);
            setExpenses(expensesData);
            setRecurringExpenses(recurringExpensesData);
            setIsInitialized(true);
        } catch (error) {
            console.error("Failed to load data:", error);
            toast({
                title: "Error",
                description: "Failed to load data",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [session?.user?.id, toast]);

    const refreshData = useCallback(async () => {
        await fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (isAuthLoading) {
            return;
        }

        if (session?.user?.id && !isInitialized) {
            fetchData();
        }

        if (!session) {
            setCategories([]);
            setExpenses([]);
            setRecurringExpenses([]);
            setIsInitialized(false);
            setIsLoading(false);
        }
    }, [isAuthLoading, session, isInitialized, fetchData]);

    const value = {
        categories,
        expenses,
        recurringExpenses,
        isLoading,
        isInitialized,
        refreshData,
        setCategories,
        setExpenses,
        setRecurringExpenses,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    
    return context;
}
