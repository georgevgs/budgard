import { supabase } from '@/config/supabase';
import { done, row, rows } from '@/config/supabaseCrud';
import { SELECT_WITH_CATEGORY } from '@/common/api/dataAccess';
import type { RecurringExpense } from '@/types/RecurringExpense';

// Supabase queries for recurring, at the feature root so an audit of what
// this feature reads and writes is one file.
export const recurringApi = {

  async getRecurringExpenses(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('recurring_expenses')
      .select(SELECT_WITH_CATEGORY)
      .eq('user_id', ownerId)
      .eq('type', 'expense')
      .order('created_at', { ascending: false });
    if (signal) query = query.abortSignal(signal);

    return rows<RecurringExpense>(query);
  },

  async getRecurringIncomes(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('recurring_expenses')
      .select(SELECT_WITH_CATEGORY)
      .eq('user_id', ownerId)
      .eq('type', 'income')
      .order('created_at', { ascending: false });
    if (signal) query = query.abortSignal(signal);

    return rows<RecurringExpense>(query);
  },

  async createRecurringIncome(
    incomeData: Partial<RecurringExpense>,
    ownerId: string,
  ) {
    return row<RecurringExpense>(
      supabase
        .from('recurring_expenses')
        .insert({ ...incomeData, user_id: ownerId, type: 'income' })
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },

  async updateRecurringIncome(
    incomeData: Partial<RecurringExpense>,
    incomeId: string,
  ) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = incomeData;

    return row<RecurringExpense>(
      supabase
        .from('recurring_expenses')
        .update(safeUpdate)
        .eq('id', incomeId)
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },

  async deleteRecurringIncome(incomeId: string) {
    await done(supabase.from('recurring_expenses').delete().eq('id', incomeId));
  },

  async toggleRecurringIncome(incomeId: string, active: boolean) {
    return row<RecurringExpense>(
      supabase
        .from('recurring_expenses')
        .update({ active })
        .eq('id', incomeId)
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },

  async createRecurringExpense(
    expenseData: Partial<RecurringExpense>,
    ownerId: string,
  ) {
    return row<RecurringExpense>(
      supabase
        .from('recurring_expenses')
        .insert({ ...expenseData, user_id: ownerId })
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },

  async updateRecurringExpense(
    expenseData: Partial<RecurringExpense>,
    expenseId: string,
  ) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = expenseData;

    return row<RecurringExpense>(
      supabase
        .from('recurring_expenses')
        .update(safeUpdate)
        .eq('id', expenseId)
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },

  async deleteRecurringExpense(expenseId: string) {
    await done(
      supabase.from('recurring_expenses').delete().eq('id', expenseId),
    );
  },

  async toggleRecurringExpense(expenseId: string, active: boolean) {
    return row<RecurringExpense>(
      supabase
        .from('recurring_expenses')
        .update({ active })
        .eq('id', expenseId)
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },
};
