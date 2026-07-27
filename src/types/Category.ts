export type CategoryType = 'expense' | 'income';

// 50/30/20 classification (Elizabeth Warren). Income categories use 'income'.
export type CategoryKind = 'need' | 'want' | 'savings' | 'income';

export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  user_id: string;
  created_at: string;
  type?: CategoryType;
  kind?: CategoryKind | null;
}

// Shape of a category embedded on a transaction row. Fetches select only the
// columns the UI renders, so embeds must not claim user_id/created_at exist.
export type EmbeddedCategory = Pick<
  Category,
  'id' | 'name' | 'color' | 'icon' | 'type' | 'kind'
>;
