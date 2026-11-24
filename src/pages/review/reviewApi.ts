import { supabase } from '@/config/supabase';
import { countRows, rows } from '@/common/api/supabaseCrud';
import { transactionCursorFilter } from '@/common/api/dataAccess';
import type { Expense } from '@/types/Expense';

const REVIEW_PAGE_SIZE = 50;

export const reviewApi = {
  getPendingReviewCount(ownerId: string, signal: AbortSignal) {
    return countRows(
      supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', ownerId)
        .eq('review_status', 'pending')
        .abortSignal(signal),
    );
  },

  async getPendingReviewPage(
    ownerId: string,
    cursor: Expense | null,
    signal: AbortSignal,
  ) {
    const query = supabase
      .from('expenses')
      .select(
        'id, user_id, created_at, date, description, merchant_name, amount, type, category_id, tag_id, category:categories!expenses_category_id_fkey(id, name, color, icon, type, kind)',
      )
      .eq('user_id', ownerId)
      .eq('review_status', 'pending')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(REVIEW_PAGE_SIZE + 1)
      .abortSignal(signal);
    if (null !== cursor) {
      query.or(transactionCursorFilter(cursor));
    }

    const transactions = await rows<Expense>(query);
    if (REVIEW_PAGE_SIZE < transactions.length) {
      return {
        items: transactions.slice(0, REVIEW_PAGE_SIZE),
        nextCursor: transactions[REVIEW_PAGE_SIZE - 1],
      };
    } else {
      return { items: transactions, nextCursor: null };
    }
  },
};
