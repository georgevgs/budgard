import { supabase } from '@/lib/supabase';
import { rows } from '@/services/supabaseCrud';
import type { FinancialConnection } from '@/types/FinancialConnection';

const SAFE_CONNECTION_COLUMNS = [
  'id',
  'user_id',
  'provider',
  'institution_name',
  'status',
  'last_synced_at',
  'last_error_code',
  'created_at',
  'updated_at',
].join(',');

export const financialConnectionService = {
  async getConnections(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('financial_connections')
      .select(SAFE_CONNECTION_COLUMNS)
      .eq('user_id', ownerId)
      .order('created_at');
    if (signal) query = query.abortSignal(signal);

    return rows<FinancialConnection>(query);
  },
};
