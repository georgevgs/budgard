import { supabase } from '@/config/supabase';
import { done, row, rows } from '@/common/api/supabaseCrud';
import type { Category } from '@/types/Category';

// Supabase queries for categories, at the feature root so an audit of what
// this feature reads and writes is one file.
export const categoriesApi = {

  async getCategories(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('categories')
      .select('*')
      .eq('user_id', ownerId)
      .order('name');
    if (signal) {
      query = query.abortSignal(signal);
    }

    return rows<Category>(query);
  },

  async createCategory(categoryData: Partial<Category>, ownerId: string) {
    return row<Category>(
      supabase
        .from('categories')
        .insert({ ...categoryData, user_id: ownerId })
        .select()
        .single(),
    );
  },

  async updateCategory(categoryId: string, categoryData: Partial<Category>) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = categoryData;

    return row<Category>(
      supabase
        .from('categories')
        .update(safeUpdate)
        .eq('id', categoryId)
        .select()
        .single(),
    );
  },

  async deleteCategory(categoryId: string) {
    await done(supabase.from('categories').delete().eq('id', categoryId));
  },

  // Atomic reassign-then-delete via Postgres function: every expense on
  // fromCategoryId moves to toCategoryId, then fromCategoryId is removed.
  // Returns the number of expenses moved.
  async mergeCategory(fromCategoryId: string, toCategoryId: string) {
    return row<number>(
      supabase.rpc('merge_category', {
        p_from_category_id: fromCategoryId,
        p_to_category_id: toCategoryId,
      }),
    );
  },
};
