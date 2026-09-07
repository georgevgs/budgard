import { supabase } from '@/config/supabase';
import { done, row, rows } from '@/common/api/supabaseCrud';
import type { Goal } from '@/types/Goal';

// Supabase queries for goals, at the feature root so an audit of what
// this feature reads and writes is one file.
export const goalsApi = {

  async getGoals(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('goals')
      .select('*')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false });
    if (signal) {
      query = query.abortSignal(signal);
    }

    return rows<Goal>(query);
  },

  async createGoal(goalData: Partial<Goal>, ownerId: string) {
    return row<Goal>(
      supabase
        .from('goals')
        .insert({ ...goalData, user_id: ownerId })
        .select()
        .single(),
    );
  },

  async updateGoal(goalId: string, goalData: Partial<Goal>) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = goalData;

    return row<Goal>(
      supabase
        .from('goals')
        .update(safeUpdate)
        .eq('id', goalId)
        .select()
        .single(),
    );
  },

  async deleteGoal(goalId: string) {
    await done(supabase.from('goals').delete().eq('id', goalId));
  },
};
