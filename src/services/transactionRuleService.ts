import { supabase } from '@/lib/supabase';
import { done, row, rows } from '@/services/supabaseCrud';
import type {
  TransactionRule,
  TransactionRuleDraft,
} from '@/types/TransactionRule';

export const transactionRuleService = {
  async getRules(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('transaction_rules')
      .select('*')
      .eq('user_id', ownerId)
      .order('priority')
      .order('created_at');
    if (signal) query = query.abortSignal(signal);

    return rows<TransactionRule>(query);
  },

  async createRule(draft: TransactionRuleDraft, ownerId: string) {
    const saved = await row<TransactionRule>(
      supabase
        .from('transaction_rules')
        .insert({
          ...draft,
          user_id: ownerId,
          match_value: normalizeMatch(draft.match_value),
        })
        .select()
        .single(),
    );
    await done(
      supabase.rpc('apply_transaction_rule_to_existing', {
        p_rule_id: saved.id,
      }),
    );

    return saved;
  },

  async deleteRule(ruleId: string) {
    await done(supabase.from('transaction_rules').delete().eq('id', ruleId));
  },

  async markReviewed(transactionIds: string[], ownerId: string) {
    if (transactionIds.length === 0) {
      return [];
    }

    return rows<{ id: string }>(
      supabase
        .from('expenses')
        .update({
          review_status: 'reviewed',
          review_reason: null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('user_id', ownerId)
        .in('id', transactionIds)
        .select('id'),
    );
  },
};

// --- Helpers ---

const normalizeMatch = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
