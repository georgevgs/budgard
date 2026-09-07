import { supabase } from '@/config/supabase';
import { done, maybeRow, row, rows } from '@/common/api/supabaseCrud';
import type { Budget } from '@/types/Budget';
import type { CategoryBudget } from '@/types/CategoryBudget';

// Supabase queries for budget, at the feature root so an audit of what
// this feature reads and writes is one file.
export const budgetApi = {

  async getBudget(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('user_budgets')
      .select(
        'id, user_id, monthly_amount, default_savings_pct, default_currency, created_at, updated_at',
      )
      .eq('user_id', ownerId);
    if (signal) query = query.abortSignal(signal);

    return maybeRow<Budget>(query.maybeSingle());
  },

  async upsertBudget(monthlyAmount: number, ownerId: string) {
    return row<Budget>(
      supabase
        .from('user_budgets')
        .upsert(
          { user_id: ownerId, monthly_amount: monthlyAmount },
          { onConflict: 'user_id' },
        )
        .select(
          'id, user_id, monthly_amount, default_savings_pct, default_currency, created_at, updated_at',
        )
        .maybeSingle(),
    );
  },

  async getCategoryBudgets(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('category_budgets')
      .select('*')
      .eq('user_id', ownerId);
    if (signal) query = query.abortSignal(signal);

    return rows<CategoryBudget>(query);
  },

  async upsertCategoryBudget(
    categoryId: string,
    monthlyAmount: number,
    ownerId: string,
  ) {
    return row<CategoryBudget>(
      supabase
        .from('category_budgets')
        .upsert(
          {
            user_id: ownerId,
            category_id: categoryId,
            monthly_amount: monthlyAmount,
          },
          { onConflict: 'user_id,category_id' },
        )
        .select()
        .single(),
    );
  },

  async deleteCategoryBudget(categoryId: string, ownerId: string) {
    await done(
      supabase
        .from('category_budgets')
        .delete()
        .eq('user_id', ownerId)
        .eq('category_id', categoryId),
    );
  },
};
