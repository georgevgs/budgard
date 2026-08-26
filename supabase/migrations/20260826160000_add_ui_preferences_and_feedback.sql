-- Today layout follows the signed-in account instead of being stranded in
-- one browser. One row per owner makes the upsert idempotent and the primary
-- key is already the index every read and RLS policy needs.
CREATE TABLE public.user_ui_preferences (
  user_id UUID PRIMARY KEY DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  today_visible TEXT[] NOT NULL,
  today_hidden TEXT[] NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_ui_preferences_layout_size_check CHECK (
    cardinality(today_visible) + cardinality(today_hidden) BETWEEN 1 AND 32
  ),
  CONSTRAINT user_ui_preferences_layout_disjoint_check CHECK (
    NOT (today_visible && today_hidden)
  )
);

ALTER TABLE public.user_ui_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own UI preferences"
  ON public.user_ui_preferences FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own UI preferences"
  ON public.user_ui_preferences FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own UI preferences"
  ON public.user_ui_preferences FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE TRIGGER user_ui_preferences_set_updated_at
  BEFORE UPDATE ON public.user_ui_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Feedback is deliberately append-only for clients. People can submit a
-- report, but cannot browse either their own reports or anybody else's. The
-- service role can read the inbox for support and delete resolved reports.
CREATE TABLE public.feedback_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('feedback', 'bug')),
  message TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 10 AND 2000),
  route TEXT CHECK (route IS NULL OR char_length(route) <= 256),
  app_version TEXT NOT NULL CHECK (char_length(app_version) <= 64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX feedback_reports_user_id_idx
  ON public.feedback_reports(user_id);
CREATE INDEX feedback_reports_created_at_idx
  ON public.feedback_reports(created_at DESC);

ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit their own feedback"
  ON public.feedback_reports FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Explicit Data API privileges: the project revokes defaults for new public
-- tables, so policies alone would still produce 42501 for signed-in clients.
REVOKE ALL ON TABLE public.user_ui_preferences
  FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.feedback_reports
  FROM anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.user_ui_preferences
  TO authenticated, service_role;
GRANT INSERT ON TABLE public.feedback_reports TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.feedback_reports TO service_role;
