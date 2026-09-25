-- Runs as the database administrator, but every access assertion runs with
-- the real authenticated role. Fixtures and all writes are rolled back.
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';

CREATE TEMP TABLE security_test_users AS
  SELECT gen_random_uuid() AS owner_id, gen_random_uuid() AS other_id;
GRANT SELECT ON security_test_users TO authenticated, service_role;

INSERT INTO auth.users (id, email)
  SELECT owner_id, owner_id::text || '@example.invalid' FROM security_test_users
  UNION ALL
  SELECT other_id, other_id::text || '@example.invalid' FROM security_test_users;

INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
  SELECT other_id, 'https://web.push.apple.com/' || other_id::text,
         repeat('B', 87), repeat('A', 22)
  FROM security_test_users;

INSERT INTO public.categories (user_id, name, type, color, icon)
  SELECT owner_id, 'Security fixture owner', 'expense', 'primary', 'Tag'
  FROM security_test_users
  UNION ALL
  SELECT other_id, 'Security fixture other', 'expense', 'primary', 'Tag'
  FROM security_test_users;

INSERT INTO storage.objects (bucket_id, name)
  SELECT 'receipts', owner_id::text || '/security-fixture.jpg'
  FROM security_test_users
  UNION ALL
  SELECT 'receipts', other_id::text || '/security-fixture.jpg'
  FROM security_test_users;

-- A real access token: sub, role, email and the amr entry GoTrue writes for
-- the method that established the session. Budgard only issues email codes
-- and links, so 'password' marks a session the app never created.
CREATE FUNCTION pg_temp.sign_in(p_user_id UUID, p_method TEXT)
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT set_config('request.jwt.claims', json_build_object(
    'sub', p_user_id, 'role', 'authenticated',
    'email', p_user_id::text || '@example.invalid',
    'amr', json_build_array(json_build_object(
      'method', p_method,
      'timestamp', extract(epoch FROM now())::bigint
    ))
  )::text, true);
$$;

SELECT pg_temp.sign_in(owner_id, 'otp') FROM security_test_users;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  owner_uuid UUID;
  other_uuid UUID;
  bad_endpoint TEXT;
BEGIN
  SELECT owner_id, other_id INTO owner_uuid, other_uuid FROM security_test_users;

  IF (SELECT count(*) FROM public.categories WHERE user_id = owner_uuid) <> 1
     OR EXISTS (SELECT 1 FROM public.categories WHERE user_id = other_uuid) THEN
    RAISE EXCEPTION 'Finance read isolation failed';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE name = owner_uuid::text || '/security-fixture.jpg')
     OR EXISTS (SELECT 1 FROM storage.objects WHERE name = other_uuid::text || '/security-fixture.jpg') THEN
    RAISE EXCEPTION 'Receipt read isolation failed';
  END IF;

  IF EXISTS (SELECT 1 FROM public.push_subscriptions WHERE user_id = other_uuid) THEN
    RAISE EXCEPTION 'Push read isolation failed';
  END IF;

  -- Suggestion dismissal uses the same UPSERT on both the insert and conflict
  -- paths, so the authenticated role needs both table privileges.
  INSERT INTO public.recurring_suggestion_dismissals (user_id, fingerprint)
  VALUES (owner_uuid, 'security-fixture')
  ON CONFLICT (user_id, fingerprint) DO UPDATE
    SET fingerprint = EXCLUDED.fingerprint;

  INSERT INTO public.recurring_suggestion_dismissals (user_id, fingerprint)
  VALUES (owner_uuid, 'security-fixture')
  ON CONFLICT (user_id, fingerprint) DO UPDATE
    SET fingerprint = EXCLUDED.fingerprint;

  BEGIN
    INSERT INTO public.recurring_suggestion_dismissals (user_id, fingerprint)
    VALUES (other_uuid, 'forged-security-fixture')
    ON CONFLICT (user_id, fingerprint) DO UPDATE
      SET fingerprint = EXCLUDED.fingerprint;
    RAISE EXCEPTION 'Cross-user suggestion dismissal was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (other_uuid, 'https://web.push.apple.com/forged-' || owner_uuid::text, repeat('B', 87), repeat('A', 22));
    RAISE EXCEPTION 'Cross-user push insert was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('receipts', other_uuid::text || '/forged-fixture.jpg');
    RAISE EXCEPTION 'Cross-user receipt insert was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  FOREACH bad_endpoint IN ARRAY ARRAY[
    'https://127.0.0.1/private',
    'https://169.254.169.254/latest/meta-data',
    'https://attacker.example/push',
    'https://fcm.googleapis.com.attacker.example/push',
    'https://fcm.googleapis.com@attacker.example/push',
    'https://fcm.googleapis.com:8443/push',
    'http://fcm.googleapis.com/push'
  ] LOOP
    BEGIN
      INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (owner_uuid, bad_endpoint, repeat('B', 87), repeat('A', 22));
      RAISE EXCEPTION 'Unsafe push endpoint was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
  END LOOP;

  BEGIN
    INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (owner_uuid, 'https://web.push.apple.com/bad-key-' || owner_uuid::text, 'invalid', repeat('A', 22));
    RAISE EXCEPTION 'Malformed subscription key was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  FOR device IN 1..10 LOOP
    INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (owner_uuid, 'https://fcm.googleapis.com/fcm/send/' || owner_uuid::text || ':APA91b' || '/' || device, repeat('B', 87), repeat('A', 22));
  END LOOP;

  -- Browser re-registration uses UPSERT; refreshing an existing device at
  -- the cap must work even though BEFORE INSERT precedes conflict handling.
  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
  VALUES (owner_uuid, 'https://fcm.googleapis.com/fcm/send/' || owner_uuid::text || ':APA91b' || '/1', repeat('B', 87), repeat('C', 22))
  ON CONFLICT (endpoint) DO UPDATE SET auth = EXCLUDED.auth;

  IF (SELECT count(*) FROM public.push_subscriptions WHERE user_id = owner_uuid) <> 10 THEN
    RAISE EXCEPTION 'Valid device registration failed';
  END IF;

  BEGIN
    INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (owner_uuid, 'https://fcm.googleapis.com/fcm/send/' || owner_uuid::text || ':APA91b' || '/11', repeat('B', 87), repeat('A', 22));
    RAISE EXCEPTION 'Subscription cap was bypassed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  UPDATE public.categories SET name = 'Unauthorized change' WHERE user_id = other_uuid;
  IF FOUND THEN RAISE EXCEPTION 'Cross-user finance update succeeded'; END IF;

  UPDATE storage.objects SET metadata = '{"audit":true}'::jsonb
    WHERE name = other_uuid::text || '/security-fixture.jpg';
  IF FOUND THEN RAISE EXCEPTION 'Cross-user receipt update succeeded'; END IF;
END;
$$;

-- A password session for the same account sees none of it. Supabase accepts
-- auth.signUp({ email, password }) from the anon key even though the app never
-- calls it, so without this a stranger could pre-register an address.
-- The other fixture account is used because the owner is at the device cap,
-- whose trigger would fire before the policy under test.
RESET ROLE;
SELECT pg_temp.sign_in(other_id, 'password') FROM security_test_users;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  other_uuid UUID;
BEGIN
  SELECT other_id INTO other_uuid FROM security_test_users;

  IF EXISTS (SELECT 1 FROM public.categories) THEN
    RAISE EXCEPTION 'Password session read finance rows';
  END IF;

  IF EXISTS (SELECT 1 FROM storage.objects) THEN
    RAISE EXCEPTION 'Password session read receipts';
  END IF;

  IF EXISTS (SELECT 1 FROM public.push_subscriptions) THEN
    RAISE EXCEPTION 'Password session read push subscriptions';
  END IF;

  BEGIN
    INSERT INTO public.categories (user_id, name, type, color, icon)
    VALUES (other_uuid, 'Password fixture', 'expense', 'primary', 'Tag');
    RAISE EXCEPTION 'Password session wrote a finance row';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (other_uuid, 'https://web.push.apple.com/password-' || other_uuid::text, repeat('B', 87), repeat('A', 22));
    RAISE EXCEPTION 'Password session registered a push device';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

-- Household sharing: the invited address claims the invitation, the partner
-- reaches the owner's space only while the owner is Pro, and a revoke ends it.
RESET ROLE;
CREATE TEMP TABLE security_test_household AS
  SELECT gen_random_uuid() AS stranger_id, NULL::UUID AS invite_token;
GRANT SELECT, UPDATE ON security_test_household TO authenticated;

INSERT INTO auth.users (id, email)
  SELECT stranger_id, stranger_id::text || '@example.invalid'
  FROM security_test_household;

INSERT INTO public.subscriptions (
  user_id, stripe_subscription_id, stripe_customer_id, stripe_price_id, status
)
  SELECT owner_id, 'sub_security_fixture', 'cus_security_fixture',
         'price_security_fixture', 'active'
  FROM security_test_users;

SELECT pg_temp.sign_in(owner_id, 'otp') FROM security_test_users;
SET LOCAL ROLE authenticated;

UPDATE security_test_household
SET invite_token = (
  SELECT share.invite_token
  FROM public.create_household_invite(
    (SELECT other_id::text || '@example.invalid' FROM security_test_users)
  ) AS share
);

RESET ROLE;
SELECT pg_temp.sign_in(other_id, 'password') FROM security_test_users;
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.household_shares) THEN
    RAISE EXCEPTION 'Password session saw a household invitation';
  END IF;

  BEGIN
    PERFORM public.accept_household_invite(
      (SELECT invite_token FROM security_test_household)
    );
    RAISE EXCEPTION 'Password session accepted a household invitation';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;
SELECT pg_temp.sign_in(stranger_id, 'otp') FROM security_test_household;
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.household_shares) THEN
    RAISE EXCEPTION 'A stranger saw another address''s invitation';
  END IF;

  BEGIN
    PERFORM public.accept_household_invite(
      (SELECT invite_token FROM security_test_household)
    );
    RAISE EXCEPTION 'A stranger accepted another address''s invitation';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;
SELECT pg_temp.sign_in(other_id, 'otp') FROM security_test_users;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  owner_uuid UUID;
  other_uuid UUID;
BEGIN
  SELECT owner_id, other_id INTO owner_uuid, other_uuid FROM security_test_users;

  IF NOT EXISTS (SELECT 1 FROM public.household_shares WHERE status = 'pending') THEN
    RAISE EXCEPTION 'The invited address could not see its invitation';
  END IF;

  PERFORM public.accept_household_invite(
    (SELECT invite_token FROM security_test_household)
  );

  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = owner_uuid) THEN
    RAISE EXCEPTION 'An accepted partner could not read the shared space';
  END IF;

  INSERT INTO public.expenses (user_id, amount, description, date)
  VALUES (owner_uuid, 1, 'Partner fixture', CURRENT_DATE);

  BEGIN
    INSERT INTO public.expenses (user_id, amount, description, date, created_by)
    VALUES (owner_uuid, 1, 'Forged creator fixture', CURRENT_DATE, owner_uuid);
    RAISE EXCEPTION 'A partner recorded an expense as the owner';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.expenses SET created_by = owner_uuid
    WHERE user_id = owner_uuid AND created_by = other_uuid;
    RAISE EXCEPTION 'A partner rewrote an expense creator';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

RESET ROLE;
SELECT pg_temp.sign_in(other_id, 'password') FROM security_test_users;
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.categories
    WHERE user_id = (SELECT owner_id FROM security_test_users)
  ) THEN
    RAISE EXCEPTION 'A partner password session read the shared space';
  END IF;
END;
$$;

RESET ROLE;
UPDATE public.subscriptions SET status = 'canceled'
WHERE user_id = (SELECT owner_id FROM security_test_users);
SELECT pg_temp.sign_in(other_id, 'otp') FROM security_test_users;
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.categories
    WHERE user_id = (SELECT owner_id FROM security_test_users)
  ) THEN
    RAISE EXCEPTION 'A partner kept access after the owner lost Pro';
  END IF;
END;
$$;

RESET ROLE;
UPDATE public.subscriptions SET status = 'active'
WHERE user_id = (SELECT owner_id FROM security_test_users);
SELECT pg_temp.sign_in(owner_id, 'otp') FROM security_test_users;
SET LOCAL ROLE authenticated;

SELECT public.revoke_household_share();

RESET ROLE;
SELECT pg_temp.sign_in(other_id, 'otp') FROM security_test_users;
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.categories
    WHERE user_id = (SELECT owner_id FROM security_test_users)
  ) THEN
    RAISE EXCEPTION 'A partner kept access after a revoke';
  END IF;

  BEGIN
    PERFORM public.accept_household_invite(
      (SELECT invite_token FROM security_test_household)
    );
    RAISE EXCEPTION 'A revoked invitation token was accepted again';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

-- Per-account ceilings on client-writable stores. Rows are backdated on the
-- way in to prove the window runs on server time, not on what the client sent.
RESET ROLE;
SELECT pg_temp.sign_in(owner_id, 'otp') FROM security_test_users;
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  FOR attempt IN 1..5 LOOP
    INSERT INTO public.feedback_reports (kind, message, app_version, created_at)
    VALUES ('bug', 'Security fixture report', 'test', now() - INTERVAL '30 days');
  END LOOP;

  BEGIN
    INSERT INTO public.feedback_reports (kind, message, app_version)
    VALUES ('bug', 'Security fixture report', 'test');
    RAISE EXCEPTION 'Feedback ceiling was bypassed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  FOR attempt IN 1..500 LOOP
    INSERT INTO public.product_events (event_name, app_version, occurred_at)
    VALUES ('app_opened', 'test', now() - INTERVAL '30 days');
  END LOOP;

  BEGIN
    INSERT INTO public.product_events (event_name, app_version)
    VALUES ('app_opened', 'test');
    RAISE EXCEPTION 'Product event ceiling was bypassed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

RESET ROLE;
INSERT INTO storage.objects (bucket_id, name)
  SELECT 'receipts', owner_id::text || '/quota-' || n || '.webp'
  FROM security_test_users, generate_series(1, 1998) AS n;
INSERT INTO storage.objects (bucket_id, name, metadata)
  SELECT 'receipts', other_id::text || '/quota-large.webp',
         jsonb_build_object('size', 524288000)
  FROM security_test_users;
SELECT pg_temp.sign_in(owner_id, 'otp') FROM security_test_users;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  owner_uuid UUID;
BEGIN
  SELECT owner_id INTO owner_uuid FROM security_test_users;

  -- 1,999 objects (the fixture plus 1,998): one more fits, the next does not.
  INSERT INTO storage.objects (bucket_id, name)
  VALUES ('receipts', owner_uuid::text || '/quota-last.webp');

  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('receipts', owner_uuid::text || '/quota-over.webp');
    RAISE EXCEPTION 'Receipt object ceiling was bypassed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;
SELECT pg_temp.sign_in(other_id, 'otp') FROM security_test_users;
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('receipts', (SELECT other_id FROM security_test_users)::text || '/quota-over.webp');
    RAISE EXCEPTION 'Receipt byte ceiling was bypassed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

-- Billing mirror: only the webhook's service role writes it, and a stale event
-- about a second subscription cannot knock the live one out of the row.
DO $$
BEGIN
  BEGIN
    PERFORM public.apply_subscription_event(
      (SELECT other_id FROM security_test_users), 'sub_forged', 'cus_forged',
      'price_forged', 'active', false, NULL, NULL, NULL, true, now()
    );
    RAISE EXCEPTION 'A client wrote its own subscription';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;
SET LOCAL ROLE service_role;

DO $$
DECLARE
  other_uuid UUID;
  row_subscription TEXT;
  row_status TEXT;
BEGIN
  SELECT other_id INTO other_uuid FROM security_test_users;

  PERFORM public.apply_subscription_event(
    other_uuid, 'sub_old_fixture', 'cus_fixture', 'price_fixture', 'unpaid',
    false, NULL, NULL, NULL, true, now() - INTERVAL '3 hours'
  );
  PERFORM public.apply_subscription_event(
    other_uuid, 'sub_new_fixture', 'cus_fixture', 'price_fixture', 'active',
    false, NULL, NULL, NULL, true, now() - INTERVAL '2 hours'
  );
  PERFORM public.apply_subscription_event(
    other_uuid, 'sub_old_fixture', 'cus_fixture', 'price_fixture', 'canceled',
    false, NULL, NULL, NULL, true, now() - INTERVAL '1 hour'
  );

  SELECT stripe_subscription_id, status INTO row_subscription, row_status
  FROM public.subscriptions WHERE user_id = other_uuid;
  IF row_subscription <> 'sub_new_fixture' OR row_status <> 'active' THEN
    RAISE EXCEPTION 'A second subscription''s cancellation downgraded the live one';
  END IF;

  PERFORM public.apply_subscription_event(
    other_uuid, 'sub_new_fixture', 'cus_fixture', 'price_fixture', 'active',
    false, NULL, NULL, NULL, true, now() - INTERVAL '90 minutes'
  );
  PERFORM public.apply_subscription_event(
    other_uuid, 'sub_new_fixture', 'cus_fixture', 'price_fixture', 'canceled',
    false, NULL, NULL, NULL, true, now()
  );
  PERFORM public.apply_subscription_event(
    other_uuid, 'sub_new_fixture', 'cus_fixture', 'price_fixture', 'active',
    false, NULL, NULL, NULL, true, now() - INTERVAL '30 minutes'
  );

  SELECT status INTO row_status
  FROM public.subscriptions WHERE user_id = other_uuid;
  IF row_status <> 'canceled' THEN
    RAISE EXCEPTION 'An older event re-granted a canceled subscription';
  END IF;

  PERFORM public.apply_subscription_event(
    other_uuid, 'sub_next_fixture', 'cus_fixture', 'price_fixture', 'incomplete',
    false, NULL, NULL, NULL, true, now() + INTERVAL '1 minute'
  );

  SELECT stripe_subscription_id INTO row_subscription
  FROM public.subscriptions WHERE user_id = other_uuid;
  IF row_subscription <> 'sub_next_fixture' THEN
    RAISE EXCEPTION 'A new subscription could not replace an ended one';
  END IF;
END;
$$;

RESET ROLE;
ROLLBACK;
SELECT 'Security boundary checks passed; all fixtures rolled back' AS result;
