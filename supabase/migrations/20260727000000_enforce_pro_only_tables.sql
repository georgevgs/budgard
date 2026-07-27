-- Savings goals and per-category budgets are Pro features. The UI gates them
-- (ProRoute on /goals, upsell intercept on the category-budget manager), but
-- until now nothing stopped a direct PostgREST insert — a free user talking
-- straight to the API could create rows the app would then happily display.
--
-- INSERT only: existing rows stay readable, updatable and deletable, so a
-- downgraded Pro user keeps what they created (same stance as the recurring
-- expenses cap in 20260720000001).

CREATE OR REPLACE FUNCTION public.enforce_pro_only_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
-- SECURITY DEFINER so the check still works if the subscriptions RLS policies
-- ever change; the function reads only the inserting user's own rows and
-- returns nothing beyond the error.
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_pro BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = NEW.user_id
      AND status IN ('trialing', 'active', 'past_due')
  ) INTO is_pro;

  IF is_pro THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'This feature requires a Pro subscription'
    USING ERRCODE = 'check_violation';
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_pro_only_insert FROM PUBLIC;

CREATE TRIGGER goals_pro_only
  BEFORE INSERT ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pro_only_insert();

CREATE TRIGGER category_budgets_pro_only
  BEFORE INSERT ON public.category_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pro_only_insert();
