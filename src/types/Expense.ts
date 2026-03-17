import { Category } from '@/types/Category.ts';
import { Tag } from '@/types/Tag.ts';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  category_id?: string | null;
  recurring_expense_id?: string | null;
  tag_id?: string | null;
  user_id: string;
  receipt_path?: string | null;
  created_at: string;
  category?: Category;
  tag?: Tag;
}
