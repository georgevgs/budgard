export type Budget = {
  id: string;
  user_id: string;
  monthly_amount: number;
  created_at: string;
  updated_at: string;
}

export type BudgetFormData = {
  amount: string;
}
