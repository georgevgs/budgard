import { supabase } from '@/config/supabase';
import { done, row, rows } from '@/common/api/supabaseCrud';
import type { Tag } from '@/types/Tag';

// Supabase queries for tags, at the feature root so an audit of what
// this feature reads and writes is one file.
export const tagsApi = {

  async getTags(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('tags')
      .select('*')
      .eq('user_id', ownerId)
      .order('name');
    if (signal) {
      query = query.abortSignal(signal);
    }

    return rows<Tag>(query);
  },

  async createTag(tagData: { name: string; color: string }, ownerId: string) {
    return row<Tag>(
      supabase
        .from('tags')
        .insert({ ...tagData, user_id: ownerId })
        .select()
        .single(),
    );
  },

  async updateTag(tagId: string, tagData: { name: string }) {
    return row<Tag>(
      supabase.from('tags').update(tagData).eq('id', tagId).select().single(),
    );
  },

  // expenses.tag_id is ON DELETE SET NULL and expense_tags cascades,
  // so deleting a tag never touches the expenses themselves.
  async deleteTag(tagId: string) {
    await done(supabase.from('tags').delete().eq('id', tagId));
  },
};
