import { supabase } from '@/lib/supabase';
import { done, row, rows } from '@/services/supabaseCrud';
import type { HouseholdShare } from '@/types/Household';

export const householdService = {
  async getVisibleShares(signal?: AbortSignal) {
    let query = supabase
      .from('household_shares')
      .select('*')
      .order('created_at', { ascending: false });
    if (signal) query = query.abortSignal(signal);

    return rows<HouseholdShare>(query);
  },

  async createInvite(email: string) {
    return row<HouseholdShare>(
      supabase
        .rpc('create_household_invite', { p_invite_email: email })
        .single(),
    );
  },

  async acceptInvite(token: string) {
    return row<HouseholdShare>(
      supabase
        .rpc('accept_household_invite', { p_invite_token: token })
        .single(),
    );
  },

  async revokeShare() {
    await done(supabase.rpc('revoke_household_share'));
  },

  async leaveShare(ownerId: string) {
    await done(supabase.rpc('leave_household_share', { p_owner_id: ownerId }));
  },
};
