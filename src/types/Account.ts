// Financial accounts power the net-worth view. Liabilities (credit_card / loan)
// reduce net worth; everything else adds to it. current_balance and cost_basis
// are denormalized caches kept in sync by a DB trigger on account_balances.
export type AccountKind =
  | 'cash'
  | 'bank'
  | 'credit_card'
  | 'loan'
  | 'investment'
  | 'other';

export type Account = {
  id: string;
  user_id: string;
  name: string;
  kind: AccountKind;
  default_currency: string;
  current_balance: number;
  cost_basis: number;
  icon: string;
  color: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export const LIABILITY_KINDS: ReadonlyArray<AccountKind> = ['credit_card', 'loan'];

export const isLiability = (kind: AccountKind): boolean =>
  LIABILITY_KINDS.includes(kind);
