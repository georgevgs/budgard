import { supabase } from '@/config/supabase';
import { done, row, rows } from '@/common/api/supabaseCrud';
import { SELECT_WITH_CATEGORY, SUPABASE_PAGE_SIZE, fetchAllPages, transactionCursorFilter } from '@/common/api/dataAccess';
import type { Expense } from '@/types/Expense';

// Supabase queries for income, at the feature root so an audit of what
// this feature reads and writes is one file.
export const incomeApi = {

  async getIncomes(
    ownerId: string,
    signal?: AbortSignal,
    sinceDate?: string,
    beforeDate?: string,
  ) {
    return fetchAllPages<Expense>((cursor) => {
      let query = supabase
        .from('expenses')
        .select(SELECT_WITH_CATEGORY)
        .eq('user_id', ownerId)
        .eq('type', 'income')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(SUPABASE_PAGE_SIZE);
      if (sinceDate) {
        query = query.gte('date', sinceDate);
      }
      if (beforeDate) {
        query = query.lt('date', beforeDate);
      }
      if (cursor) {
        query = query.or(transactionCursorFilter(cursor));
      }
      if (signal) {
        query = query.abortSignal(signal);
      }

      return query;
    });
  },

  async createIncomesBulk(
    incomesData: Array<{
      date: string;
      description: string;
      amount: number;
      category_id: string | null;
    }>,
    ownerId: string,
  ) {
    return rows<Expense>(
      supabase
        .from('expenses')
        .insert(
          incomesData.map((income) => ({
            ...income,
            user_id: ownerId,
            type: 'income',
            review_status: 'pending',
            review_reason: 'import',
            reviewed_at: null,
          })),
        )
        .select(SELECT_WITH_CATEGORY),
    );
  },

  async createIncome(incomeData: Partial<Expense>, ownerId: string) {
    return row<Expense>(
      supabase
        .from('expenses')
        .insert({ ...incomeData, user_id: ownerId, type: 'income' })
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },

  async updateIncome(incomeData: Partial<Expense>, incomeId: string) {
    const {
      user_id: _u,
      created_by: _creator,
      id: _i,
      created_at: _c,
      ...safeUpdate
    } = incomeData;

    return row<Expense>(
      supabase
        .from('expenses')
        .update(safeUpdate)
        .eq('id', incomeId)
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },

  async deleteIncome(incomeId: string) {
    await done(supabase.from('expenses').delete().eq('id', incomeId));
  },
};
