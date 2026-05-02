import { Category } from '@/types/Category';

type RecurringExpenseFrequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type RecurringExpense = {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category_id?: string | null;
  frequency: RecurringExpenseFrequency;
  start_date: string;
  end_date?: string | null;
  last_generated_date?: string;
  linked_account_id?: string | null;
  created_at: string;
  active: boolean;
  type?: 'expense' | 'income';
  category?: Category;
}
