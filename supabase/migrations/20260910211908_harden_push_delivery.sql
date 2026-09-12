-- RLS proves ownership; it does not make a user-supplied destination safe for
-- the privileged notification worker. Keep the same allowlist in pushDelivery.ts.
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_endpoint_allowed CHECK (
    length(endpoint) <= 2048
    AND endpoint !~ '[[:space:]]'
    AND endpoint ~ '^https://(fcm[.]googleapis[.]com|updates[.]push[.]services[.]mozilla[.]com|web[.]push[.]apple[.]com|[a-z0-9-]+[.]notify[.]windows[.]com)/[A-Za-z0-9/_~.%?=&+:-]+$'
  ),
  ADD CONSTRAINT push_subscriptions_keys_valid CHECK (
    p256dh ~ '^[A-Za-z0-9_-]{87}=?$'
    AND auth ~ '^[A-Za-z0-9_-]{22}(==)?$'
    AND p256dh !~ '[[:space:]]'
    AND auth !~ '[[:space:]]'
  );

-- The per-user lock prevents concurrent inserts from exceeding the cap.
-- Definer rights are only for counting rows behind RLS; this function is
-- trigger-only, fully qualified, and cannot be called through the Data API.
CREATE FUNCTION private.enforce_push_subscription_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.user_id::text, 731602)
  );

  IF (
    SELECT count(*)
    FROM public.push_subscriptions
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND endpoint <> NEW.endpoint
  ) >= 10 THEN
    RAISE EXCEPTION 'Push subscription limit reached'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_push_subscription_limit()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER enforce_push_subscription_limit
  BEFORE INSERT OR UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION private.enforce_push_subscription_limit();
