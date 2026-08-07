-- Days the user explicitly confirmed they spent nothing on.
--
-- The absence of expense rows cannot carry this meaning on its own: "I spent
-- nothing" and "I never opened the app" produce byte-identical data. Any
-- reward inferred from emptiness would therefore also reward abandoning the
-- app, so the win has to be claimed deliberately — one row per claimed day.
--
-- PRIMARY KEY (user_id, day) makes the claim idempotent: tapping twice, or a
-- retried offline write, cannot bank the same day two times.

CREATE TABLE no_spend_days (
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

ALTER TABLE no_spend_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own no-spend days"
  ON no_spend_days FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own no-spend days"
  ON no_spend_days FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own no-spend days"
  ON no_spend_days FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
