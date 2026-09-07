import { supabase } from '@/config/supabase';
import { done, row, rows } from '@/common/api/supabaseCrud';
import { SELECT_WITH_CATEGORY, SUPABASE_PAGE_SIZE, fetchAllPages, transactionCursorFilter } from '@/common/api/dataAccess';
import type { Debt } from '@/types/Debt';
import type { Expense } from '@/types/Expense';

// Supabase queries for debts, at the feature root so an audit of what
// this feature reads and writes is one file.
export const debtsApi = {

  // Interest accrues every day, but recompute_debt_balance only ran when a
  // payment row moved — so a debt untouched for months carried a balance
  // months out of date, and that figure feeds net worth and the payoff
  // planner. Bringing the balances current immediately before reading them
  // means the number is fresh exactly when someone is looking at it.
  // Best-effort: a failure here must not stop the debts from loading.
  async refreshDebtBalances(ownerId: string) {
    await done(supabase.rpc('refresh_debt_balances', { p_owner_id: ownerId }));
  },

  async getDebts(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('debts')
      .select('*')
      .eq('user_id', ownerId)
      .eq('is_archived', false)
      .order('created_at', { ascending: true });
    if (signal) query = query.abortSignal(signal);

    return rows<Debt>(query);
  },

  async getDebtById(debtId: string, signal?: AbortSignal) {
    let query = supabase.from('debts').select('*').eq('id', debtId);
    if (signal) query = query.abortSignal(signal);

    return row<Debt>(query.single());
  },

  async createDebt(debtData: Partial<Debt>, ownerId: string) {
    // Most users only know what they currently owe, not the original loan
    // amount. We treat the entered current_balance as both original_principal
    // and current_balance — the recompute trigger will keep current_balance
    // correct from there as payments are logged.
    return row<Debt>(
      supabase
        .from('debts')
        .insert({
          ...debtData,
          user_id: ownerId,
          original_principal: debtData.current_balance,
        })
        .select()
        .single(),
    );
  },

  async updateDebt(debtId: string, debtData: Partial<Debt>) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = debtData;

    return row<Debt>(
      supabase
        .from('debts')
        .update(safeUpdate)
        .eq('id', debtId)
        .select()
        .single(),
    );
  },

  async archiveDebt(debtId: string) {
    return row<Debt>(
      supabase
        .from('debts')
        .update({ is_archived: true })
        .eq('id', debtId)
        .select()
        .single(),
    );
  },

  async getDebtPayments(debtId: string, signal?: AbortSignal) {
    return fetchAllPages<Expense>((cursor) => {
      let query = supabase
        .from('expenses')
        .select(SELECT_WITH_CATEGORY)
        .eq('debt_id', debtId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(SUPABASE_PAGE_SIZE);
      if (cursor) query = query.or(transactionCursorFilter(cursor));
      if (signal) query = query.abortSignal(signal);

      return query;
    });
  },
};
