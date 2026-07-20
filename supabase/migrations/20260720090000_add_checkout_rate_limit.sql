-- Per-user rate limit for the stripe-checkout Edge Function. Each checkout
-- request consumes one slot; more than the allowed number inside the window
-- is refused. Durable in Postgres because Edge Function isolates are
-- ephemeral — an in-memory counter would reset on every cold start.
CREATE TABLE checkout_attempts (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX checkout_attempts_user_time_idx
  ON checkout_attempts (user_id, attempted_at);

-- No policies on purpose: only consume_checkout_attempt() below (SECURITY
-- DEFINER) touches this table.
ALTER TABLE checkout_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON checkout_attempts FROM anon, authenticated;

-- Returns whether the calling user may start another checkout right now, and
-- records the attempt when allowed. Limits are hardcoded rather than taken as
-- parameters so a caller invoking the RPC directly cannot loosen them; the
-- worst a direct caller can do is burn their own slots.
CREATE OR REPLACE FUNCTION consume_checkout_attempt()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_max_attempts constant integer := 5;
  v_window constant interval := '10 minutes';
  v_recent integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Expired attempts are pruned inline, so the table never needs a cron.
  DELETE FROM checkout_attempts
  WHERE user_id = v_user_id
    AND attempted_at < now() - v_window;

  SELECT count(*) INTO v_recent
  FROM checkout_attempts
  WHERE user_id = v_user_id;

  IF v_recent >= v_max_attempts THEN
    RETURN false;
  END IF;

  INSERT INTO checkout_attempts (user_id) VALUES (v_user_id);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION consume_checkout_attempt() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION consume_checkout_attempt() TO authenticated;
