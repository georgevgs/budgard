-- Critical security fix: get_recurring_due_on and get_inactive_push_users are
-- SECURITY DEFINER cron helpers that should only run under the service role.
-- The previous migration revoked EXECUTE from anon/authenticated directly, but
-- both roles inherit EXECUTE from the PUBLIC pseudo-role, so the revoke had no
-- effect — anyone with the anon key could call them via PostgREST and dump
-- every user's recurring expenses (description, amount, currency, user_id).
--
-- Fix: revoke from PUBLIC, grant explicitly to service_role, and add a
-- defence-in-depth caller check so a future grant slip can't re-expose the data.

REVOKE EXECUTE ON FUNCTION public.get_recurring_due_on(date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_inactive_push_users(date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_recurring_due_on(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_inactive_push_users(date) TO service_role;


CREATE OR REPLACE FUNCTION public.get_recurring_due_on(p_target_date DATE)
RETURNS TABLE(
  user_id UUID,
  recurring_expense_id UUID,
  description TEXT,
  amount NUMERIC,
  default_currency TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Cron-only helper. Block any caller other than service_role even if a
  -- future grant accidentally re-exposes EXECUTE to anon/authenticated.
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND current_user <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    re.user_id,
    re.id AS recurring_expense_id,
    re.description,
    re.amount,
    COALESCE(ub.default_currency, 'EUR') AS default_currency
  FROM recurring_expenses re
  LEFT JOIN user_budgets ub ON ub.user_id = re.user_id
  WHERE re.active = true
    AND re.start_date <= p_target_date
    AND (re.end_date IS NULL OR re.end_date >= p_target_date)
    AND CASE
      WHEN re.last_generated_date IS NOT NULL THEN
        calculate_next_occurrence(re.frequency, re.last_generated_date, re.start_date)
      ELSE
        re.start_date
    END = p_target_date;
END;
$$;


CREATE OR REPLACE FUNCTION public.get_inactive_push_users(p_since_date DATE)
RETURNS TABLE(user_id UUID)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND current_user <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ps.user_id
  FROM push_subscriptions ps
  WHERE NOT EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.user_id = ps.user_id
      AND e.created_at >= p_since_date::timestamptz
  );
END;
$$;

-- CREATE OR REPLACE preserves prior privileges, so re-revoke from PUBLIC after
-- the redefinition (Postgres's default is to grant EXECUTE to PUBLIC on new
-- functions; we want to keep that closed).
REVOKE EXECUTE ON FUNCTION public.get_recurring_due_on(date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_inactive_push_users(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recurring_due_on(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_inactive_push_users(date) TO service_role;
