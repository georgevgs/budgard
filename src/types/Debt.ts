// Debts: payoff-focused tracker for liabilities (credit cards, loans, etc.).
// current_balance is denormalized — kept in sync by a DB trigger that replays
// the linked expenses (payments) on every write.
export type DebtKind =
  | 'credit_card'
  | 'student_loan'
  | 'mortgage'
  | 'auto_loan'
  | 'personal_loan'
  | 'medical'
  | 'other';

export type PayoffStrategy = 'snowball' | 'avalanche';

export type Debt = {
  id: string;
  user_id: string;
  name: string;
  kind: DebtKind;
  original_principal: number;
  current_balance: number;
  apr: number;
  minimum_payment: number;
  currency: string;
  start_date: string;
  payoff_target_date?: string | null;
  icon: string;
  color: string;
  is_archived: boolean;
  is_completed: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const DEBT_KINDS: ReadonlyArray<DebtKind> = [
  'credit_card',
  'student_loan',
  'mortgage',
  'auto_loan',
  'personal_loan',
  'medical',
  'other',
];
