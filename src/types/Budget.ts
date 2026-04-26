export type Budget = {
  id: string;
  user_id: string;
  monthly_amount: number;
  default_currency: string;
  daily_reminder_hour: number | null;
  default_savings_pct: number | null;
  created_at: string;
  updated_at: string;
}

export type BudgetFormData = {
  amount: string;
}
