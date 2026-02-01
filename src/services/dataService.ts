import { supabase } from '@/lib/supabase';
import type { Budget } from '@/types/Budget';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';

export const QueryKeys = {
  USER: 'user',
  CATEGORIES: 'categories',
  EXPENSES: 'expenses',
  BUDGET: 'budget',
  RECURRING_EXPENSES: 'recurring-expenses',
} as const;

export const dataService = {
  async getUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data as Category[];
  },

  async getExpenses() {
    const { data, error } = await supabase
      .from('expenses')
      .select(
        `
               *,
               category:categories(*),
               recurring_expense:recurring_expenses(*)
           `,
      )
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as (Expense & { recurring_expense: RecurringExpense | null })[];
  },

  async updateExpense(expenseData: Partial<Expense>, expenseId: string) {
    const { data, error } = await supabase
      .from('expenses')
      .update(expenseData)
      .eq('id', expenseId)
      .select(`*, category:categories(*)`)
      .single();

    if (error) throw error;
    return data as Expense;
  },

  async createExpense(expenseData: Partial<Expense>) {
    const { data, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select(`*, category:categories(*)`)
      .single();

    if (error) throw error;
    return data as Expense;
  },

  async deleteExpense(expenseId: string) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;
  },

  async createCategory(categoryData: Partial<Category>) {
    const { data, error } = await supabase
      .from('categories')
      .insert(categoryData)
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async getRecurringExpenses() {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select(
        `
               *,
               category:categories(*),
               expenses:expenses(*)
           `,
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as (RecurringExpense & { expenses: Expense[] })[];
  },

  async createRecurringExpense(expenseData: Partial<RecurringExpense>) {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert(expenseData)
      .select(`*, category:categories(*)`)
      .single();

    if (error) throw error;
    return data as RecurringExpense;
  },

  async updateRecurringExpense(
    expenseData: Partial<RecurringExpense>,
    expenseId: string,
  ) {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update(expenseData)
      .eq('id', expenseId)
      .select(`*, category:categories(*)`)
      .single();

    if (error) throw error;
    return data as RecurringExpense;
  },

  async deleteRecurringExpense(expenseId: string) {
    const { error } = await supabase
      .from('recurring_expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;
  },

  async toggleRecurringExpense(expenseId: string, active: boolean) {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update({ active })
      .eq('id', expenseId)
      .select(`*, category:categories(*)`)
      .single();

    if (error) throw error;
    return data as RecurringExpense;
  },

  async processRecurringExpenses(targetDate?: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-recurring-expenses`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_date: targetDate || new Date().toISOString().split('T')[0],
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to process recurring expenses');
    }

    return response.json() as Promise<{
      success: boolean;
      generated_count: number;
      processed_recurring_ids: string[];
      target_date: string;
    }>;
  },

  async getUpcomingRecurringExpenses(daysAhead: number = 30) {
    const { data, error } = await supabase.rpc('get_upcoming_recurring_expenses', {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_days_ahead: daysAhead,
    });

    if (error) throw error;
    return data as Array<{
      recurring_expense_id: string;
      description: string;
      amount: number;
      category_id: string | null;
      next_occurrence: string;
      frequency: string;
    }>;
  },

  async getBudget() {
    const { data, error } = await supabase
      .from('user_budgets')
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return data as Budget | null;
  },

  async upsertBudget(monthlyAmount: number) {
    const user = await this.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_budgets')
      .upsert(
        { user_id: user.id, monthly_amount: monthlyAmount },
        { onConflict: 'user_id' },
      )
      .select()
      .maybeSingle();

    if (error) throw error;
    return data as Budget;
  },
};
