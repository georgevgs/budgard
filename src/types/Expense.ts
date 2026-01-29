import { Category } from '@/types/Category.ts';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  category_id?: string;
  recurring_expense_id?: string;
  user_id: string;
  created_at: string;
  category?: Category;
}
