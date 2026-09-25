-- The hourly push job carried CRON_SECRET inline in cron.job.command, set by
-- hand in the SQL editor (see 20260424000001). Anyone who can read cron.job —
-- the dashboard, a pooler credential, a schema backup — read the secret in
-- plain text, and because the job lived only in the dashboard, rebuilding the
-- project from migrations silently dropped every notification.
--
-- The job now reads the secret from Supabase Vault each time it fires, and its
-- definition lives here.
--
-- ORDER MATTERS. Store the secret first, in the SQL editor:
--
--   SELECT vault.create_secret(
--     '<the CRON_SECRET the Edge Function has>',
--     'send_push_notifications_cron_secret'
--   );
--
-- Without it this migration changes nothing and raises a WARNING, so applying
-- it early can never stop notifications. After it runs, rotate the secret
-- (the old one sat in plain text): `supabase secrets set CRON_SECRET=<new>`
-- and `SELECT vault.update_secret(<id>, '<new>')` back to back.

DO $migration$
DECLARE
  existing_schedule TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets
    WHERE name = 'send_push_notifications_cron_secret'
  ) THEN
    RAISE WARNING
      'Vault secret send_push_notifications_cron_secret is missing; '
      'the push cron job was left unchanged. Create it and re-run this '
      'migration''s body.';

    RETURN;
  END IF;

  -- Keep whatever cadence the hand-made job had; hourly is what the Edge
  -- Function expects (it matches each user's reminder hour).
  SELECT job.schedule
  INTO existing_schedule
  FROM cron.job AS job
  WHERE job.command LIKE '%/functions/v1/send-push-notifications%'
  ORDER BY job.jobid
  LIMIT 1;

  -- The hand-made job may carry another name; two jobs would double every
  -- notification, so any job calling the function is replaced by this one.
  PERFORM cron.unschedule(job.jobid)
  FROM cron.job AS job
  WHERE job.command LIKE '%/functions/v1/send-push-notifications%';

  PERFORM cron.schedule(
    'send-push-notifications',
    COALESCE(existing_schedule, '0 * * * *'),
    $job$
    SELECT net.http_post(
      url := 'https://htamokfphaqudeivpowr.supabase.co/functions/v1/send-push-notifications',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'send_push_notifications_cron_secret'
        ),
        'Content-Type',
        'application/json'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
    $job$
  );
END;
$migration$;

-- Rollback: SELECT cron.unschedule('send-push-notifications'); then recreate
-- the job from the comment in 20260424000001_add_push_notification_cron.sql.
