-- The free tier includes up to 10 categories per type (FREE_CATEGORY_LIMIT in
-- src/lib/proLimits.ts) — expense and income categories counted separately.
-- The onboarding seed creates at most 8, so new users always start under the
-- cap. Existing rows above the cap are untouched (a downgraded Pro user keeps
-- what they created; they just cannot add more), matching the other free caps.

CREATE OR REPLACE FUNCTION public.enforce_free_category_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_pro BOOLEAN;
  type_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = NEW.user_id
      AND status IN ('trialing', 'active', 'past_due')
  ) INTO is_pro;

  IF is_pro THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO type_count
  FROM categories
  WHERE user_id = NEW.user_id
    AND type = NEW.type
    AND id <> NEW.id;

  IF type_count >= 10 THEN
    RAISE EXCEPTION 'Free plan allows up to 10 categories'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_free_category_cap FROM PUBLIC;

CREATE TRIGGER categories_free_cap
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_free_category_cap();
