-- Keep auth.jwt() in an initplan so the invitation-email branch is evaluated
-- once per statement instead of once per candidate household row.
DROP POLICY IF EXISTS "Participants can view household shares"
  ON public.household_shares;

CREATE POLICY "Participants can view household shares"
  ON public.household_shares
  FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR member_id = (SELECT auth.uid())
    OR (
      status = 'pending'
      AND lower(invite_email) = lower(
        COALESCE((SELECT auth.jwt()) ->> 'email', '')
      )
    )
  );

-- Type the interval explicitly for plpgsql_check and serialize attempts per
-- user so concurrent Checkout requests cannot all pass the same count check.
CREATE OR REPLACE FUNCTION public.consume_checkout_attempt()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_max_attempts CONSTANT INTEGER := 5;
  v_window CONSTANT INTERVAL := INTERVAL '10 minutes';
  v_recent INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  DELETE FROM public.checkout_attempts
  WHERE user_id = v_user_id
    AND attempted_at < now() - v_window;

  SELECT count(*)
  INTO v_recent
  FROM public.checkout_attempts
  WHERE user_id = v_user_id;

  IF v_recent >= v_max_attempts THEN
    RETURN false;
  END IF;

  INSERT INTO public.checkout_attempts (user_id)
  VALUES (v_user_id);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_checkout_attempt() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_checkout_attempt() TO authenticated;
