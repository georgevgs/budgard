import { supabase } from '@/config/supabase';
import { done, row, rows } from '@/common/api/supabaseCrud';
import { SELECT_TEMPLATE, SELECT_WITH_CATEGORY_AND_TAG, SUPABASE_PAGE_SIZE, buildBulkExpense, fetchAllPages, flattenExtraTags, transactionCursorFilter } from '@/common/api/dataAccess';
import type { ExpenseWritePayload } from '@/common/api/dataAccess';
import type { Expense } from '@/types/Expense';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';

// Supabase queries for expenses, at the feature root so an audit of what
// this feature reads and writes is one file.
export const expensesApi = {

  async getExpenses(
    ownerId: string,
    signal?: AbortSignal,
    sinceDate?: string,
    beforeDate?: string,
  ) {
    const rows = await fetchAllPages<Expense>((cursor) => {
      let query = supabase
        .from('expenses')
        .select(SELECT_WITH_CATEGORY_AND_TAG)
        .eq('user_id', ownerId)
        .eq('type', 'expense')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(SUPABASE_PAGE_SIZE);
      if (sinceDate) query = query.gte('date', sinceDate);
      if (beforeDate) query = query.lt('date', beforeDate);
      if (cursor) query = query.or(transactionCursorFilter(cursor));
      if (signal) query = query.abortSignal(signal);

      return query;
    });

    return rows.map(flattenExtraTags);
  },

  async updateExpense(expenseData: ExpenseWritePayload, expenseId: string) {
    // Strip immutable fields — user_id, id, created_at must never be changed via update.
    // RLS WITH CHECK also enforces this server-side, but stripping client-side is defence-in-depth.
    // extra_tag_ids/extra_tags are not row columns; extras are synced below.
    const {
      user_id: _u,
      created_by: _creator,
      id: _i,
      created_at: _c,
      extra_tag_ids,
      extra_tags: _e,
      ...safeUpdate
    } = expenseData;
    const { data, error } = await supabase
      .from('expenses')
      .update(safeUpdate)
      .eq('id', expenseId)
      .select(SELECT_WITH_CATEGORY_AND_TAG)
      .single();

    if (error) throw error;

    // undefined = caller didn't touch tags; [] = caller cleared the extras.
    if (extra_tag_ids === undefined) {
      return flattenExtraTags(data as Expense);
    }

    await this.setExpenseExtraTags(expenseId, extra_tag_ids, data.user_id);

    return this.getExpenseById(expenseId);
  },

  async createExpense(expenseData: ExpenseWritePayload, ownerId: string) {
    const { extra_tag_ids, extra_tags: _e, ...rowData } = expenseData;
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...rowData, user_id: ownerId })
      .select(SELECT_WITH_CATEGORY_AND_TAG)
      .single();

    if (error) throw error;

    const created = data as Expense;
    if (!extra_tag_ids || extra_tag_ids.length === 0) {
      return flattenExtraTags(created);
    }

    await this.setExpenseExtraTags(created.id, extra_tag_ids, ownerId);

    return this.getExpenseById(created.id);
  },

  // Replaces the full extras set for one expense. Delete-then-insert keeps
  // the logic obvious; the sets involved are tiny.
  async setExpenseExtraTags(
    expenseId: string,
    tagIds: string[],
    ownerId: string,
  ) {
    const { error: deleteError } = await supabase
      .from('expense_tags')
      .delete()
      .eq('expense_id', expenseId);

    if (deleteError) throw deleteError;
    if (tagIds.length === 0) return;

    const { error: insertError } = await supabase.from('expense_tags').insert(
      tagIds.map((tagId) => ({
        expense_id: expenseId,
        tag_id: tagId,
        user_id: ownerId,
      })),
    );

    if (insertError) throw insertError;
  },

  async getExpenseById(expenseId: string) {
    const { data, error } = await supabase
      .from('expenses')
      .select(SELECT_WITH_CATEGORY_AND_TAG)
      .eq('id', expenseId)
      .single();

    if (error) throw error;

    return flattenExtraTags(data as Expense);
  },

  async createExpensesBulk(
    expensesData: Array<{
      date: string;
      description: string;
      amount: number;
      category_id: string | null;
      // Carried by splits so the parts inherit what the original was: its
      // primary tag, its note, and whether it counted towards totals.
      tag_id?: string | null;
      note?: string | null;
      is_excluded?: boolean;
    }>,
    ownerId: string,
    reviewReason?: 'import' | 'connection',
  ) {
    const { data, error } = await supabase
      .from('expenses')
      .insert(
        expensesData.map((expense) =>
          buildBulkExpense(expense, ownerId, reviewReason),
        ),
      )
      .select(SELECT_WITH_CATEGORY_AND_TAG);

    if (error) throw error;

    return (data as Expense[]).map(flattenExtraTags);
  },

  async deleteExpense(expenseId: string) {
    await done(supabase.from('expenses').delete().eq('id', expenseId));
  },

  async getTemplates(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('expense_templates')
      .select(SELECT_TEMPLATE)
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false });
    if (signal) query = query.abortSignal(signal);

    return rows<ExpenseTemplate>(query);
  },

  async createTemplate(
    templateData: Partial<ExpenseTemplate>,
    ownerId: string,
  ) {
    return row<ExpenseTemplate>(
      supabase
        .from('expense_templates')
        .insert({ ...templateData, user_id: ownerId })
        .select(SELECT_TEMPLATE)
        .single(),
    );
  },

  async deleteTemplate(templateId: string) {
    await done(
      supabase.from('expense_templates').delete().eq('id', templateId),
    );
  },
};
