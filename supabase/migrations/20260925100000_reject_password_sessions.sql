-- Budgard signs people in by email only: a one-time code or link sent to the
-- inbox. Supabase's email provider nevertheless accepts
-- auth.signUp({ email, password }) from the public anon key, so anyone can
-- register a password against an address they do not control. Depending on
-- the hosted confirmation setting that yields either an immediate session or
-- a password that becomes valid once the real owner confirms by email — and
-- household invitations are matched on the JWT email alone.
--
-- A password cannot be refused at the auth.users row: GoTrue gives every
-- passwordless sign-up a random temporary password, so encrypted_password is
-- non-empty for real users too. The session is where the difference is
-- visible. Every access token carries an `amr` claim naming how its session
-- was established, token refreshes keep the original entries, and an
-- inbox-proven sign-in never produces 'password'. Refuse those sessions (and
-- anonymous ones, which this project does not enable) at every client-facing
-- boundary. supabase/functions/_shared/sessionAssurance.ts applies the same
-- rule to the Edge Functions; the two must stay in lock-step.
--
-- A denylist rather than an allowlist on purpose: GoTrue reports an email code
-- as 'otp', 'magiclink' or 'email/signup' depending on account state, and an
-- allowlist that missed one would lock every real user out of their data.
-- The threat is one specific method, so that is what is named.

CREATE OR REPLACE FUNCTION private.is_passwordless_session()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(
      CASE pg_catalog.jsonb_typeof((SELECT auth.jwt()) -> 'amr')
        WHEN 'array' THEN (SELECT auth.jwt()) -> 'amr'
        ELSE '[]'::jsonb
      END
    ) AS claim(entry)
    -- Objects today ({"method": …, "timestamp": …}); a bare string is RFC 8176's
    -- shape and is read the same way so a format change cannot fail open.
    WHERE COALESCE(claim.entry ->> 'method', claim.entry #>> '{}')
      IN ('password', 'anonymous')
  );
$$;

REVOKE ALL ON FUNCTION private.is_passwordless_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_passwordless_session()
  TO authenticated, service_role;

-- Every finance table, the receipts bucket and the household-aware RPCs ask
-- this one predicate, so gating it gates all of them.
CREATE OR REPLACE FUNCTION private.can_access_financial_space(p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT private.is_passwordless_session())
    AND (
      p_owner_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.household_shares AS share
        JOIN public.subscriptions AS subscription
          ON subscription.user_id = share.owner_id
        WHERE share.owner_id = p_owner_id
          AND share.member_id = (SELECT auth.uid())
          AND share.status = 'accepted'
          AND subscription.status IN ('trialing', 'active', 'past_due')
      )
    );
$$;

REVOKE ALL ON FUNCTION private.can_access_financial_space(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_access_financial_space(UUID)
  TO authenticated, service_role;

-- Pending invitations are addressed by email, which is exactly the claim a
-- password sign-up can forge.
DROP POLICY IF EXISTS "Participants can view household shares"
  ON public.household_shares;

CREATE POLICY "Participants can view household shares"
  ON public.household_shares
  FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_passwordless_session())
    AND (
      owner_id = (SELECT auth.uid())
      OR member_id = (SELECT auth.uid())
      OR (
        status = 'pending'
        AND lower(invite_email) = lower(
          COALESCE((SELECT auth.jwt()) ->> 'email', '')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users manage own push subscriptions"
  ON public.push_subscriptions;

-- A device registered from a password session would receive the account's
-- bill names and amounts on its lock screen.
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (
    (SELECT private.is_passwordless_session())
    AND (SELECT auth.uid()) = user_id
  )
  WITH CHECK (
    (SELECT private.is_passwordless_session())
    AND (SELECT auth.uid()) = user_id
  );

DROP POLICY IF EXISTS "Users can manage their notification settings"
  ON public.user_notification_settings;

CREATE POLICY "Users can manage their notification settings"
  ON public.user_notification_settings
  FOR ALL
  TO authenticated
  USING (
    (SELECT private.is_passwordless_session())
    AND user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT private.is_passwordless_session())
    AND user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can view their own subscription"
  ON public.subscriptions;

CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_passwordless_session())
    AND (SELECT auth.uid()) = user_id
  );

-- The household RPCs are SECURITY DEFINER and read auth.jwt() themselves, so
-- they bypass the policies above and need the same guard in their bodies.
-- Bodies are otherwise unchanged from 20260831151127.
CREATE OR REPLACE FUNCTION public.create_household_invite(p_invite_email TEXT)
RETURNS SETOF public.household_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := auth.uid();
  caller_email TEXT := lower(COALESCE(auth.jwt() ->> 'email', ''));
  normalized_email TEXT := lower(trim(p_invite_email));
  existing_status TEXT;
BEGIN
  IF caller_id IS NULL
     OR caller_email = ''
     OR NOT private.is_passwordless_session() THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF char_length(normalized_email) NOT BETWEEN 3 AND 320
     OR position('@' IN normalized_email) <= 1 THEN
    RAISE EXCEPTION 'Enter a valid email address' USING ERRCODE = '22023';
  END IF;

  IF normalized_email = caller_email THEN
    RAISE EXCEPTION 'Invite another person' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = caller_id
      AND status IN ('trialing', 'active', 'past_due')
  ) THEN
    RAISE EXCEPTION 'Household sharing requires Pro'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT status
  INTO existing_status
  FROM public.household_shares
  WHERE owner_id = caller_id
  FOR UPDATE;

  IF existing_status = 'accepted' THEN
    RAISE EXCEPTION 'This household already has a member'
      USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.household_shares (
    owner_id,
    owner_email,
    invite_email,
    invite_token,
    status,
    member_id,
    accepted_at,
    updated_at
  )
  VALUES (
    caller_id,
    caller_email,
    normalized_email,
    gen_random_uuid(),
    'pending',
    NULL,
    NULL,
    now()
  )
  ON CONFLICT (owner_id) DO UPDATE
  SET owner_email = EXCLUDED.owner_email,
      invite_email = EXCLUDED.invite_email,
      invite_token = EXCLUDED.invite_token,
      status = 'pending',
      member_id = NULL,
      accepted_at = NULL,
      updated_at = now();

  RETURN QUERY
  SELECT share.*
  FROM public.household_shares AS share
  WHERE share.owner_id = caller_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_household_invite(p_invite_token UUID)
RETURNS SETOF public.household_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := auth.uid();
  caller_email TEXT := lower(COALESCE(auth.jwt() ->> 'email', ''));
  invited_owner_id UUID;
BEGIN
  IF caller_id IS NULL
     OR caller_email = ''
     OR NOT private.is_passwordless_session() THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT owner_id
  INTO invited_owner_id
  FROM public.household_shares
  WHERE invite_token = p_invite_token
    AND status = 'pending'
    AND lower(invite_email) = caller_email
  FOR UPDATE;

  IF invited_owner_id IS NULL OR invited_owner_id = caller_id THEN
    RAISE EXCEPTION 'This household invitation is unavailable'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = invited_owner_id
      AND status IN ('trialing', 'active', 'past_due')
  ) THEN
    RAISE EXCEPTION 'This household invitation is unavailable'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.household_shares
    WHERE member_id = caller_id
      AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'You already belong to a household'
      USING ERRCODE = 'unique_violation';
  END IF;

  UPDATE public.household_shares
  SET member_id = caller_id,
      status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  WHERE owner_id = invited_owner_id;

  RETURN QUERY
  SELECT share.*
  FROM public.household_shares AS share
  WHERE share.owner_id = invited_owner_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_household_share()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_passwordless_session() THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.household_shares
  SET member_id = NULL,
      status = 'revoked',
      accepted_at = NULL,
      invite_token = gen_random_uuid(),
      updated_at = now()
  WHERE owner_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_household_share(p_owner_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_passwordless_session() THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.household_shares
  SET member_id = NULL,
      status = 'revoked',
      accepted_at = NULL,
      invite_token = gen_random_uuid(),
      updated_at = now()
  WHERE owner_id = p_owner_id
    AND member_id = auth.uid()
    AND status = 'accepted';
END;
$$;

-- CREATE OR REPLACE keeps existing grants; restate them so this file alone
-- describes who may call what.
REVOKE ALL ON FUNCTION public.create_household_invite(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_household_invite(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_household_share() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_household_share(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_household_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_household_invite(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_household_share() TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_household_share(UUID) TO authenticated;

COMMENT ON FUNCTION private.is_passwordless_session() IS
  'False for password or anonymous sessions; mirrored by _shared/sessionAssurance.ts.';

-- Rollback: re-run the policy and function definitions from
-- 20260831151127_add_secure_household_spaces.sql,
-- 20260904120958_optimize_household_policy_and_checkout_window.sql,
-- 20260430100000_scope_push_subscriptions_policy_to_authenticated.sql and
-- 20260719000000_add_subscriptions.sql, then
-- DROP FUNCTION private.is_passwordless_session();
