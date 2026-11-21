-- The last Checkout Session each user opened. A new session for a different
-- plan expires this one, so two subscriptions can never both be paid for.
-- Only the checkout function reads or writes it, with the service role.
CREATE TABLE public.open_checkout_sessions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.open_checkout_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.open_checkout_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.open_checkout_sessions TO service_role;
