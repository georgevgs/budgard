-- Administrator-only regression suite. All fixtures and deletions roll back.
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

CREATE TEMP TABLE retention_fixture AS SELECT gen_random_uuid() AS user_id;
INSERT INTO auth.users (id, email)
  SELECT user_id, user_id::text || '@example.invalid' FROM retention_fixture;
INSERT INTO public.product_events (user_id, event_name, app_version, occurred_at)
  SELECT user_id, 'app_opened', 'retention-test', now() - age
  FROM retention_fixture
  CROSS JOIN (VALUES (INTERVAL '91 days'), (INTERVAL '90 days'), (INTERVAL '1 day')) AS ages(age);

DO $$
BEGIN
  IF has_function_privilege('anon', 'private.prune_product_events()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'private.prune_product_events()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Clients must not execute event retention';
  END IF;
  IF NOT has_function_privilege('service_role', 'private.prune_product_events()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Service role must execute event retention';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'prune-product-events-daily'
      AND schedule = '15 6 * * *' AND active
  ) THEN
    RAISE EXCEPTION 'Daily retention job missing';
  END IF;
END;
$$;

GRANT SELECT ON retention_fixture TO service_role;
SET LOCAL ROLE service_role;

DO $$
BEGIN
  PERFORM private.prune_product_events();
  IF (SELECT count(*) FROM public.product_events
      WHERE user_id = (SELECT user_id FROM retention_fixture)) <> 2 THEN
    RAISE EXCEPTION 'Retention must delete expired events and keep the exact cutoff';
  END IF;
  IF EXISTS (SELECT 1 FROM public.product_events
      WHERE user_id = (SELECT user_id FROM retention_fixture)
        AND occurred_at < now() - INTERVAL '90 days') THEN
    RAISE EXCEPTION 'Expired fixture survived';
  END IF;
END;
$$;
ROLLBACK;
