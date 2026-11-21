-- The receipt quota counts objects under the lower-case folder that
-- uuid::text produces, but the write policies matched the folder in any case.
-- An object stored under an upper-case folder still reached the right space,
-- yet it never counted, so one account could fill the project's storage.
-- Insert and update now accept only the canonical lower-case folder, and an
-- overwrite is held to the same quota as an upload. The app always uploads
-- under the lower-case user id and never updates an object, so neither change
-- touches a path it uses.
--
-- The select and delete policies keep the case-insensitive match, so any
-- object already stored under an upper-case folder stays readable and
-- deletable.
--
-- The checkout counter now refuses password sessions like the other definer
-- RPCs.

DROP POLICY IF EXISTS "Household can insert receipts" ON storage.objects;

CREATE POLICY "Household can insert receipts" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND private.can_access_financial_space(
      CASE
        WHEN (storage.foldername(name))[1] ~
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END
    )
    -- The folder is validated before the cast here too: AND gives no
    -- evaluation order, so a bare cast could raise on a malformed name.
    AND private.receipt_quota_available(
      CASE
        WHEN (storage.foldername(name))[1] ~
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END
    )
  );

DROP POLICY IF EXISTS "Household can update receipts" ON storage.objects;

CREATE POLICY "Household can update receipts" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND private.can_access_financial_space(
      CASE
        WHEN (storage.foldername(name))[1] ~
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END
    )
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND private.can_access_financial_space(
      CASE
        WHEN (storage.foldername(name))[1] ~
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END
    )
    -- The folder is validated before the cast here too: AND gives no
    -- evaluation order, so a bare cast could raise on a malformed name.
    AND private.receipt_quota_available(
      CASE
        WHEN (storage.foldername(name))[1] ~
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END
    )
  );

-- Same body as 20260904120958_optimize_household_policy_and_checkout_window.sql,
-- plus the session check every other client-callable definer function makes.
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
  IF v_user_id IS NULL OR NOT private.is_passwordless_session() THEN
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

-- Rollback:
-- Re-run the INSERT policy from 20260925110000_bound_client_writes.sql.
-- Re-run the UPDATE policy from 20260904113851_share_household_receipts.sql,
-- after DROP POLICY "Household can update receipts" ON storage.objects;
-- Re-run consume_checkout_attempt() from
-- 20260904120958_optimize_household_policy_and_checkout_window.sql.
