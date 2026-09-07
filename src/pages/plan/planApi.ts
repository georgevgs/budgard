import { supabase } from '@/config/supabase';
import { done, maybeRow, rows } from '@/common/api/supabaseCrud';
import type { NoSpendDay } from '@/types/NoSpendDay';

// Supabase queries for plan, at the feature root so an audit of what
// this feature reads and writes is one file.
export const planApi = {

  async getNoSpendDays(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('no_spend_days')
      .select('*')
      .eq('user_id', ownerId)
      .order('day', { ascending: false });
    if (signal) {
      query = query.abortSignal(signal);
    }

    return rows<NoSpendDay>(query);
  },

  // Idempotent by primary key — a double tap or a replayed write banks the day
  // once. onConflict/ignoreDuplicates keeps that from surfacing as an error the
  // caller would have to special-case.
  async createNoSpendDay(day: string, ownerId: string) {
    return maybeRow<NoSpendDay>(
      supabase
        .from('no_spend_days')
        .upsert(
          { day, user_id: ownerId },
          { onConflict: 'user_id,day', ignoreDuplicates: true },
        )
        .select()
        .maybeSingle(),
    );
  },

  async deleteNoSpendDay(day: string, ownerId: string) {
    await done(
      supabase
        .from('no_spend_days')
        .delete()
        .eq('user_id', ownerId)
        .eq('day', day),
    );
  },
};
