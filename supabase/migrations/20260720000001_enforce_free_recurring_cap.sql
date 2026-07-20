-- The free tier allows 3 recurring expenses (FREE_RECURRING_EXPENSE_LIMIT in
-- src/lib/proLimits.ts). Until now that cap lived only in the UI, so any
-- direct PostgREST insert bypassed it. Enforce it at the table too.
--
-- Only type = 'expense' is capped: recurring income and debt payments are
-- uncapped on the free tier, matching the UI. Existing rows above the cap are
-- untouched (a downgraded Pro user keeps what they created; they just cannot
-- add more), which also matches the UI behaviour.

CREATE OR REPLACE FUNCTION public.enforce_free_recurring_expense_cap()
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
  expense_count INTEGER;
BEGIN
  IF NEW.type <> 'expense' THEN
    RETURN NEW;
  END IF;

  -- Re-typing an existing expense row does not add to the count.
  IF TG_OP = 'UPDATE' AND OLD.type = 'expense' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = NEW.user_id
      AND status IN ('trialing', 'active', 'past_due')
  ) INTO is_pro;

  IF is_pro THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO expense_count
  FROM recurring_expenses
  WHERE user_id = NEW.user_id
    AND type = 'expense'
    AND id <> NEW.id;

  IF expense_count >= 3 THEN
    RAISE EXCEPTION 'Free plan allows up to 3 recurring expenses'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_free_recurring_expense_cap FROM PUBLIC;

CREATE TRIGGER recurring_expenses_free_cap
  BEFORE INSERT OR UPDATE OF type ON public.recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_free_recurring_expense_cap();
