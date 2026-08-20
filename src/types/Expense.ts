import { EmbeddedCategory } from '@/types/Category.ts';
import { Debt } from '@/types/Debt.ts';
import { EmbeddedTag } from '@/types/Tag.ts';

// Only Expense.type consumes this; nothing imports it.
type TransactionType = 'expense' | 'income' | 'debt_payment';

export type Expense = {
  id: string;
  amount: number;
  description: string;
  date: string;
  category_id?: string | null;
  recurring_expense_id?: string | null;
  tag_id?: string | null;
  debt_id?: string | null;
  user_id: string;
  receipt_path?: string | null;
  created_at: string;
  // Multi-currency: set when expense was logged in a foreign currency
  original_amount?: number | null;
  original_currency?: string | null;
  exchange_rate?: number | null;
  // Discriminator: 'expense' (outflow), 'income' (inflow), or 'debt_payment'
  // (outflow that reduces a liability — excluded from spending aggregations).
  // DB default is 'expense'.
  type?: TransactionType;
  // Savings nudge: portion of an income row earmarked as savings.
  savings_allocation_amount?: number | null;
  category?: EmbeddedCategory;
  // Primary tag (the free tier's single tag). Additional tags — Pro only —
  // arrive flattened from the expense_tags join table.
  tag?: EmbeddedTag;
  extra_tags?: EmbeddedTag[];
  debt?: Debt;
}
