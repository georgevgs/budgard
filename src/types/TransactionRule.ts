export type RuleMatchType = 'exact' | 'contains';
export type RuleTransactionType = 'any' | 'expense' | 'income';

export type TransactionRule = {
  id: string;
  user_id: string;
  match_type: RuleMatchType;
  match_value: string;
  transaction_type: RuleTransactionType;
  rename_to: string | null;
  category_id: string | null;
  tag_id: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TransactionRuleDraft = Pick<
  TransactionRule,
  | 'match_type'
  | 'match_value'
  | 'transaction_type'
  | 'rename_to'
  | 'category_id'
  | 'tag_id'
>;
