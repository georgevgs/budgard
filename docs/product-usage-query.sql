-- Rolling 30-day aggregate report. Run as administrator; never exposes user IDs
-- or transaction amounts/descriptions. Events are best-effort and expire after
-- 90 days. Row counts are surviving data, including automatically generated rows.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
WITH usage_window AS (SELECT now() - INTERVAL '30 days' AS since),
events AS (
  SELECT event_name, count(*) AS events, count(DISTINCT user_id) AS accounts
  FROM public.product_events, usage_window WHERE occurred_at >= since GROUP BY event_name
),
activity AS (
  SELECT count(*) AS transactions, count(DISTINCT user_id) AS owners
  FROM public.expenses, usage_window WHERE created_at >= since
)
SELECT jsonb_build_object(
  'window_start', (SELECT since FROM usage_window),
  'window_end', now(),
  'accounts_total', (SELECT count(*) FROM auth.users),
  'accounts_created', (SELECT count(*) FROM auth.users, usage_window WHERE created_at >= since),
  'tracked_accounts', (SELECT count(DISTINCT user_id) FROM public.product_events, usage_window WHERE occurred_at >= since),
  'event_collection_started', (SELECT min(occurred_at) FROM public.product_events),
  'events', COALESCE((SELECT jsonb_agg(jsonb_build_object('event_name', event_name, 'events', events, 'accounts', accounts) ORDER BY event_name) FROM events), '[]'::jsonb),
  'new_surviving_transactions', (SELECT to_jsonb(activity) FROM activity),
  'current_rows', jsonb_build_object(
    'recurring_expenses', (SELECT count(*) FROM public.recurring_expenses),
    'goals', (SELECT count(*) FROM public.goals),
    'category_budgets', (SELECT count(*) FROM public.category_budgets),
    'rules', (SELECT count(*) FROM public.transaction_rules),
    'push_subscriptions', (SELECT count(*) FROM public.push_subscriptions),
    'custom_layouts', (SELECT count(*) FROM public.user_ui_preferences)
  ),
  'layouts_changed', (SELECT count(*) FROM public.user_ui_preferences, usage_window WHERE updated_at >= since)
) AS report;
COMMIT;
