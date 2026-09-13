-- Dismissals use INSERT ... ON CONFLICT DO UPDATE, which requires UPDATE
-- privilege even when the insert does not encounter a conflict.
GRANT UPDATE ON TABLE public.recurring_suggestion_dismissals
  TO authenticated, service_role;
