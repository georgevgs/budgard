-- Align expenses and categories user_id foreign keys to ON DELETE CASCADE.
-- All other public.* tables already cascade on auth.users deletion. The
-- delete-account edge function papers over this gap with explicit deletes,
-- but any non-edge-function path (Supabase dashboard, future code) would
-- fail with a foreign-key violation. Aligning these closes that gap and
-- removes a single point of failure for GDPR right-to-erasure.

BEGIN;

ALTER TABLE public.expenses
  DROP CONSTRAINT expenses_user_id_fkey,
  ADD CONSTRAINT expenses_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.categories
  DROP CONSTRAINT categories_user_id_fkey,
  ADD CONSTRAINT categories_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

COMMIT;
