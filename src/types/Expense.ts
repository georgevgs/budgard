import { Category } from '@/types/Category.ts';
import { Tag } from '@/types/Tag.ts';

export type TransactionType = 'expense' | 'income';

export type Expense = {
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
  // Multi-currency: set when expense was logged in a foreign currency
  original_amount?: number | null;
  original_currency?: string | null;
  exchange_rate?: number | null;
  // Discriminator: 'expense' (outflow) or 'income' (inflow). DB default is 'expense'.
  type?: TransactionType;
  // Savings nudge: portion of an income row earmarked as savings.
  savings_allocation_amount?: number | null;
  category?: Category;
  tag?: Tag;
}
