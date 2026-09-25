-- Three client-writable stores had no per-account ceiling: feedback reports,
-- product events and the receipts bucket. Any one signed-in account could
-- insert until the project's plan quota ran out, and that takes the app down
-- for everybody, not only for them. Each gets a limit well above real use.
--
-- The counts run on server-stamped time. Clients hold a table-level INSERT
-- grant, so without the stamp a caller could backdate rows out of the window
-- that is supposed to count them. The service role (support tooling,
-- retention jobs) is exempt, matching protect_expense_connection_origin.

CREATE INDEX IF NOT EXISTS feedback_reports_user_created_idx
  ON public.feedback_reports (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.limit_feedback_reports()
RETURNS TRIGGER
LANGUAGE plpgsql
-- Definer rights only to count rows the caller cannot SELECT; the table is
-- insert-only for clients.
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  hourly_count INTEGER;
  daily_count INTEGER;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.created_at := now();

  -- Serialise per account so concurrent inserts cannot all pass one count.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.user_id::text, 8801)
  );

  SELECT
    count(*) FILTER (WHERE report.created_at > now() - INTERVAL '1 hour'),
    count(*)
  INTO hourly_count, daily_count
  FROM public.feedback_reports AS report
  WHERE report.user_id = NEW.user_id
    AND report.created_at > now() - INTERVAL '1 day';

  IF hourly_count >= 5 OR daily_count >= 20 THEN
    RAISE EXCEPTION 'Feedback limit reached'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.limit_feedback_reports()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER feedback_reports_limit
  BEFORE INSERT ON public.feedback_reports
  FOR EACH ROW
  EXECUTE FUNCTION private.limit_feedback_reports();

-- A boot records two or three events, so 500 a day is far past any person.
-- Past the ceiling the insert fails, and trackProductEvent already swallows
-- failures: metrics never surface as product errors.
CREATE OR REPLACE FUNCTION private.limit_product_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.occurred_at := now();

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.user_id::text, 8802)
  );

  IF (
    SELECT count(*)
    FROM public.product_events AS event
    WHERE event.user_id = NEW.user_id
      AND event.occurred_at > now() - INTERVAL '1 day'
  ) >= 500 THEN
    RAISE EXCEPTION 'Product event limit reached'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.limit_product_events()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER product_events_limit
  BEFORE INSERT ON public.product_events
  FOR EACH ROW
  EXECUTE FUNCTION private.limit_product_events();

-- Receipts are compressed to about 1 MB before upload, but a direct Storage
-- call skips that and the bucket allows 10 MB per object. Cap each financial
-- space (the first folder segment) by object count and stored bytes. 2,000
-- receipts is more than five a day for a year; 500 MB is 250 KB each at that
-- count. The in-flight object is not yet counted, so one upload may overshoot
-- the byte cap by at most the bucket's per-object limit.
CREATE OR REPLACE FUNCTION private.receipt_quota_available(p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
-- Definer rights so the count sees the whole space, including objects a
-- partner uploaded, and so this read does not re-enter the policies on
-- storage.objects that call it.
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    count(*) < 2000
    AND COALESCE(
      sum(
        CASE
          WHEN object.metadata ->> 'size' ~ '^[0-9]{1,18}$'
          THEN (object.metadata ->> 'size')::BIGINT
          ELSE 0
        END
      ),
      0
    ) < 500::BIGINT * 1024 * 1024
  FROM storage.objects AS object
  WHERE object.bucket_id = 'receipts'
    AND object.name LIKE p_owner_id::text || '/%';
$$;

REVOKE ALL ON FUNCTION private.receipt_quota_available(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.receipt_quota_available(UUID)
  TO authenticated, service_role;

-- Same shape as 20260904113851_share_household_receipts.sql, plus the quota.
DROP POLICY IF EXISTS "Household can insert receipts" ON storage.objects;

CREATE POLICY "Household can insert receipts" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND private.can_access_financial_space(
      CASE
        WHEN (storage.foldername(name))[1] ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END
    )
    -- The folder is validated before the cast here too: AND gives no
    -- evaluation order, so a bare cast could raise on a malformed name.
    AND private.receipt_quota_available(
      CASE
        WHEN (storage.foldername(name))[1] ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END
    )
  );

-- Rollback:
-- DROP TRIGGER feedback_reports_limit ON public.feedback_reports;
-- DROP TRIGGER product_events_limit ON public.product_events;
-- DROP FUNCTION private.limit_feedback_reports();
-- DROP FUNCTION private.limit_product_events();
-- DROP INDEX public.feedback_reports_user_created_idx;
-- Re-run the INSERT policy from 20260904113851_share_household_receipts.sql,
-- then DROP FUNCTION private.receipt_quota_available(UUID);
