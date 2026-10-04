-- Keep three rolling months for aggregate adoption comparisons. No financial
-- records are affected; the client remains insert-only on this event log.
CREATE INDEX product_events_occurred_idx
  ON public.product_events (occurred_at);

CREATE FUNCTION private.prune_product_events()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM public.product_events
  WHERE occurred_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION private.prune_product_events()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.prune_product_events() TO service_role;

SELECT cron.schedule(
  'prune-product-events-daily',
  '15 6 * * *',
  'SELECT private.prune_product_events();'
);

-- A fixed vocabulary measures feature visits and completed expensive actions
-- without recording route parameters, receipt text or financial values.
ALTER TABLE public.product_events DROP CONSTRAINT product_events_event_name_check;
ALTER TABLE public.product_events ADD CONSTRAINT product_events_event_name_check
  CHECK (event_name IN (
    'app_opened',
    'today_ready',
    'monthly_position_opened',
    'onboarding_started',
    'onboarding_categories_submitted',
    'onboarding_first_expense_submitted',
    'onboarding_completed',
    'monthly_budget_saved',
    'recurring_expense_created',
    'quick_add_opened',
    'quick_add_submitted',
    'activity_opened',
    'trends_opened',
    'plan_opened',
    'accounts_opened',
    'goals_opened',
    'debts_opened',
    'review_opened',
    'settings_opened',
    'receipt_scan_completed',
    'statement_import_completed',
    'csv_export_completed',
    'annual_pdf_export_completed',
    'data_export_completed'
  ));
