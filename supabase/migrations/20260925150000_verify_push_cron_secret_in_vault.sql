-- The push job's secret was written twice: in Vault, where pg_cron reads it
-- (20260925130000), and in the Edge Function's CRON_SECRET, which only the
-- Management API can change. Rotating it meant changing both back to back,
-- and any run that fell between the two was refused. The function now asks
-- the database whether a bearer token matches the Vault secret, so the value
-- lives in one place and rotating it is a single vault.update_secret().
--
-- Only service_role may call this. It returns a boolean, so the secret never
-- leaves the database, and it compares SHA-256 digests, so how long the
-- comparison takes says nothing about how much of a guess was right. An empty
-- or missing secret matches nothing.

CREATE OR REPLACE FUNCTION public.push_cron_secret_matches(p_candidate TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      SELECT extensions.digest(secret.decrypted_secret, 'sha256')
        = extensions.digest(p_candidate, 'sha256')
      FROM vault.decrypted_secrets AS secret
      WHERE secret.name = 'send_push_notifications_cron_secret'
        AND secret.decrypted_secret <> ''
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.push_cron_secret_matches(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_cron_secret_matches(TEXT) TO service_role;

-- Rollback: DROP FUNCTION public.push_cron_secret_matches(TEXT); after
-- redeploying a send-push-notifications that reads CRON_SECRET again.
