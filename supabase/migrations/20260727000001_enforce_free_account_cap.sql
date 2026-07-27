-- Net worth stays free, but depth is Pro: the free tier tracks up to 3 active
-- accounts (FREE_ACCOUNT_LIMIT in src/lib/proLimits.ts). Existing rows above
-- the cap are untouched (a downgraded Pro user keeps what they created; they
-- just cannot add more), matching the recurring-expenses cap.
--
-- Unarchiving also re-enters the active set, so it is capped the same way a
-- fresh insert is.

CREATE OR REPLACE FUNCTION public.enforce_free_account_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_pro BOOLEAN;
  active_count INTEGER;
BEGIN
  IF NEW.is_archived THEN
    RETURN NEW;
  END IF;

  -- Editing an already-active account does not add to the count.
  IF TG_OP = 'UPDATE' AND NOT OLD.is_archived THEN
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

  SELECT count(*) INTO active_count
  FROM accounts
  WHERE user_id = NEW.user_id
    AND NOT is_archived
    AND id <> NEW.id;

  IF active_count >= 3 THEN
    RAISE EXCEPTION 'Free plan allows up to 3 accounts'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_free_account_cap FROM PUBLIC;

CREATE TRIGGER accounts_free_cap
  BEFORE INSERT OR UPDATE OF is_archived ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_free_account_cap();
