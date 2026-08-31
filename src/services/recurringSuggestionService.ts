import { supabase } from '@/lib/supabase';
import { done, row, rows } from '@/services/supabaseCrud';

type Dismissal = {
  user_id: string;
  fingerprint: string;
  dismissed_by: string;
  created_at: string;
};

export const recurringSuggestionService = {
  async getDismissals(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('recurring_suggestion_dismissals')
      .select('*')
      .eq('user_id', ownerId);
    if (signal) query = query.abortSignal(signal);

    return rows<Dismissal>(query);
  },

  async dismiss(fingerprint: string, ownerId: string) {
    return row<Dismissal>(
      supabase
        .from('recurring_suggestion_dismissals')
        .upsert(
          { user_id: ownerId, fingerprint },
          { onConflict: 'user_id,fingerprint' },
        )
        .select()
        .single(),
    );
  },

  async reconcile(ownerId: string) {
    return row<number>(
      supabase.rpc('reconcile_recurring_imports', { p_owner_id: ownerId }),
    );
  },

  async clearDismissal(fingerprint: string, ownerId: string) {
    await done(
      supabase
        .from('recurring_suggestion_dismissals')
        .delete()
        .eq('user_id', ownerId)
        .eq('fingerprint', fingerprint),
    );
  },
};
