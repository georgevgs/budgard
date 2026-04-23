-- Push notification subscriptions for Web Push.
-- Each row stores one browser/device subscription endpoint per user.
-- A user may have multiple subscriptions (phone + desktop).

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- Helper: recurring expenses due on a specific date (for push reminders)
-- Called by send-push-notifications Edge Function via service role (bypasses RLS).
-- ============================================================================

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

-- Service role only — not callable via PostgREST by regular users.
REVOKE EXECUTE ON FUNCTION public.get_recurring_due_on(DATE) FROM anon, authenticated;


-- ============================================================================
-- Helper: users with push subscriptions but no recent expenses (inactivity nudge)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_inactive_push_users(p_since_date DATE)
RETURNS TABLE(user_id UUID)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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

REVOKE EXECUTE ON FUNCTION public.get_inactive_push_users(DATE) FROM anon, authenticated;
