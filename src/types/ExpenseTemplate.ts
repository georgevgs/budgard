import type { EmbeddedCategory } from '@/types/Category';
import type { EmbeddedTag } from '@/types/Tag';

export type ExpenseTemplate = {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category_id: string | null;
  tag_id: string | null;
  original_currency: string | null;
  created_at: string;
  category?: EmbeddedCategory;
  tag?: EmbeddedTag;
};
