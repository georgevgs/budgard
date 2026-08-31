-- Lets a user fold one category into another: every expense pointing at
-- `p_from_category_id` is repointed at `p_to_category_id`, then the source
-- category is deleted. Alternative to a plain delete (which now SET NULLs
-- those expenses instead — see 20260831130000) for someone who would rather
-- keep the transactions categorized than let them go Uncategorized.
--
-- SECURITY INVOKER, not DEFINER: this only ever touches rows the calling
-- user already owns, so it runs under the caller's own role and leans on the
-- existing RLS policies on categories/expenses rather than bypassing them.
-- The explicit user_id filters below are belt-and-braces on top of that, and
-- let the function tell "not yours" apart from "doesn't exist" with a clear
-- error instead of a silent no-op.

BEGIN;

CREATE OR REPLACE FUNCTION public.merge_category(
  p_from_category_id UUID,
  p_to_category_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_from_type TEXT;
  v_to_type   TEXT;
  v_moved     INTEGER;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_from_category_id = p_to_category_id THEN
    RAISE EXCEPTION 'Cannot merge a category into itself';
  END IF;

  SELECT type INTO v_from_type
    FROM public.categories WHERE id = p_from_category_id AND user_id = v_caller_id;
  SELECT type INTO v_to_type
    FROM public.categories WHERE id = p_to_category_id AND user_id = v_caller_id;

  IF v_from_type IS NULL OR v_to_type IS NULL THEN
    RAISE EXCEPTION 'Category not found';
  END IF;

  IF v_from_type != v_to_type THEN
    RAISE EXCEPTION 'Cannot merge categories of different types';
  END IF;

  UPDATE public.expenses
     SET category_id = p_to_category_id
   WHERE category_id = p_from_category_id
     AND user_id = v_caller_id;
  GET DIAGNOSTICS v_moved = ROW_COUNT;

  -- recurring_expenses / expense_templates / goals still pointing at the
  -- source category fall back to NULL here via their existing ON DELETE SET
  -- NULL foreign keys — merge only rewrites expenses, matching what the
  -- delete-confirmation UI has ever promised.
  DELETE FROM public.categories
   WHERE id = p_from_category_id
     AND user_id = v_caller_id;

  RETURN v_moved;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.merge_category(UUID, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.merge_category(UUID, UUID) TO authenticated;

COMMIT;
