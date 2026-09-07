import type { EmbeddedCategory } from '@/types/Category';
import type { RecurringExpense } from '@/types/RecurringExpense';

export type RecurringSuggestion = {
  fingerprint: string;
  description: string;
  merchantPattern: string;
  amount: number;
  frequency: RecurringExpense['frequency'];
  type: 'expense' | 'income';
  categoryId: string | null;
  category?: EmbeddedCategory;
  nextDate: string;
  occurrences: number;
};
