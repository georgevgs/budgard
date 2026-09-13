-- First-party product outcomes only: no route, description, category,
-- free-form JSON or other financial context can be stored here. The fixed
-- event vocabulary is enough to calculate setup, return and completion rates.
CREATE TABLE public.product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL CHECK (event_name IN (
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
    'quick_add_submitted'
  )),
  app_version TEXT NOT NULL CHECK (
    char_length(btrim(app_version)) BETWEEN 1 AND 64
  ),
  duration_ms INTEGER CHECK (duration_ms BETWEEN 0 AND 120000),
  load_kind TEXT CHECK (load_kind IN ('cold', 'cached')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_events_user_occurred_idx
  ON public.product_events(user_id, occurred_at DESC);
CREATE INDEX product_events_name_occurred_idx
  ON public.product_events(event_name, occurred_at DESC);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit their own product events"
  ON public.product_events FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Clients can append their own fixed-shape events but cannot read the event
-- log. Analysis and retention jobs run with the service role.
REVOKE ALL ON TABLE public.product_events
  FROM anon, authenticated, service_role;
GRANT INSERT ON TABLE public.product_events TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.product_events TO service_role;
