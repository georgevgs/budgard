// One row per user-recorded balance update on an account. balance is in the
// account's default_currency. Foreign-currency entries also store the original
// amount + rate, mirroring the multi-currency pattern on expenses.
// contribution_delta tracks deposits/withdrawals on investment accounts so
// gain = current_balance − cost_basis.
export type AccountBalance = {
  id: string;
  account_id: string;
  user_id: string;
  balance: number;
  contribution_delta?: number | null;
  original_amount?: number | null;
  original_currency?: string | null;
  exchange_rate?: number | null;
  recorded_at: string;
  note?: string | null;
  created_at: string;
}
