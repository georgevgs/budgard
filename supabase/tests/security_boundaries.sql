-- Runs as the database administrator, but every access assertion runs with
-- the real authenticated role. Fixtures and all writes are rolled back.
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';

CREATE TEMP TABLE security_test_users AS
  SELECT gen_random_uuid() AS owner_id, gen_random_uuid() AS other_id;
GRANT SELECT ON security_test_users TO authenticated;

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

SELECT set_config('request.jwt.claims', json_build_object(
  'sub', owner_id, 'role', 'authenticated',
  'email', owner_id::text || '@example.invalid'
)::text, true) FROM security_test_users;
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

RESET ROLE;
ROLLBACK;
SELECT 'Security boundary checks passed; all fixtures rolled back' AS result;
