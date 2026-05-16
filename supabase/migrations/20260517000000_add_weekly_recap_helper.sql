-- Helper: per-user rolling 7-day spend, scoped to users with push subs.
-- Called by send-push-notifications Edge Function on Sundays so the cron job
-- can address a concrete "you spent €X this week — open the app for the
-- anomaly breakdown" message to each user, without exposing other users' data
-- via PostgREST.

CREATE OR REPLACE FUNCTION public.get_weekly_recap_push_users(p_window_end DATE)
RETURNS TABLE(
  user_id UUID,
  week_total NUMERIC,
  default_currency TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.user_id,
    COALESCE(SUM(e.amount), 0)::numeric AS week_total,
    COALESCE(ub.default_currency, 'EUR') AS default_currency
  FROM push_subscriptions ps
  LEFT JOIN user_budgets ub ON ub.user_id = ps.user_id
  LEFT JOIN expenses e
    ON e.user_id = ps.user_id
    AND e.date BETWEEN (p_window_end - INTERVAL '6 days') AND p_window_end
    AND COALESCE(e.type, 'expense') <> 'debt_payment'
  GROUP BY ps.user_id, ub.default_currency
  HAVING COALESCE(SUM(e.amount), 0) > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_weekly_recap_push_users(DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_weekly_recap_push_users(DATE) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_recap_push_users(DATE) TO service_role;
