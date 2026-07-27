export type Tag = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

// Shape of a tag embedded on a transaction row. Fetches select only the
// columns the UI renders, so embeds must not claim user_id/created_at exist.
export type EmbeddedTag = Pick<Tag, 'id' | 'name' | 'color'>;
