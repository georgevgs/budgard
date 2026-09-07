export type FinancialConnectionStatus =
  'pending' | 'active' | 'reauth_required' | 'error' | 'disconnected';

export type FinancialConnection = {
  id: string;
  user_id: string;
  provider: string;
  institution_name: string;
  status: FinancialConnectionStatus;
  last_synced_at: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
};
