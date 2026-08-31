import { supabase } from '@/lib/supabase';
import { row } from '@/services/supabaseCrud';
import type { Expense } from '@/types/Expense';

export const goalFundingService = {
  async investSurplus(
    goalId: string,
    amount: number,
    investedOn: string,
    description: string,
  ) {
    return row<Expense>(
      supabase.rpc('invest_goal_surplus', {
        p_goal_id: goalId,
        p_amount: amount,
        p_invested_on: investedOn,
        p_description: description,
      }),
    );
  },
};
