import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase, type Expense } from '@/lib/supabase';

export function useExpenses() {
    const { user } = useUser();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchExpenses();
        }
    }, [user]);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            setExpenses(data || []);
        } catch (err) {
            console.error('Error fetching expenses:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const addExpense = async (expense: Omit<Expense, 'id' | 'created_at' | 'user_id'>) => {
        try {
            setLoading(true);

            // Create a new expense without explicitly setting user_id
            // Let RLS handle it based on the JWT claim
            const { data, error } = await supabase
                .from('expenses')
                .insert([expense])
                .select()
                .single();

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            setExpenses((prev) => [data, ...prev]);
            return data;
        } catch (err) {
            console.error('Error adding expense:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteExpense = async (id: string) => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setExpenses((prev) => prev.filter((expense) => expense.id !== id));
        } catch (err) {
            console.error('Error deleting expense:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateExpense = async (
        id: string,
        updates: Partial<Omit<Expense, 'id' | 'created_at' | 'user_id'>>
    ) => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('expenses')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setExpenses((prev) =>
                prev.map((expense) => (expense.id === id ? data : expense))
            );
            return data;
        } catch (err) {
            console.error('Error updating expense:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        expenses,
        loading,
        error,
        addExpense,
        deleteExpense,
        updateExpense,
        refetch: fetchExpenses,
    };
}