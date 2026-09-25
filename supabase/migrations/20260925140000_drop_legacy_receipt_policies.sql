-- Two receipts policies were created in the dashboard and never lived in a
-- migration: "Users can view own receipts" (SELECT) and "Users can upload
-- receipts to own folder" (INSERT). Both only compare the first folder
-- segment with auth.uid(). Storage policies are permissive and OR together,
-- so these two sat beside the household policies and let a caller past
-- everything those enforce: a password session still read and wrote its own
-- folder (20260925100000), and uploads skipped the per-space quota
-- (20260925110000).
--
-- Nothing legitimate depends on them. For an email-code session on its own
-- folder, private.can_access_financial_space() is true, so the "Household can
-- read/insert receipts" policies already allow exactly what these did.
--
-- 20260904113851 dropped the migration-managed predecessors by name; these
-- names differ, which is why they survived it.

DROP POLICY IF EXISTS "Users can view own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload receipts to own folder" ON storage.objects;

-- Fail the migration, rather than ship a false sense of safety, if any other
-- receipts policy still bypasses the shared predicate.
DO $$
DECLARE
  bypassing TEXT;
BEGIN
  SELECT string_agg(policy.policyname, ', ' ORDER BY policy.policyname)
  INTO bypassing
  FROM pg_catalog.pg_policies AS policy
  WHERE policy.schemaname = 'storage'
    AND policy.tablename = 'objects'
    AND COALESCE(policy.qual, '') || COALESCE(policy.with_check, '')
      LIKE '%receipts%'
    AND COALESCE(policy.qual, '') || COALESCE(policy.with_check, '')
      NOT LIKE '%can_access_financial_space%';

  IF bypassing IS NOT NULL THEN
    RAISE EXCEPTION 'Receipts policies bypass can_access_financial_space: %',
      bypassing;
  END IF;
END;
$$;

-- Rollback (restores the bypass; only if something unforeseen needs it):
-- CREATE POLICY "Users can view own receipts" ON storage.objects
--   FOR SELECT TO authenticated
--   USING (bucket_id = 'receipts'
--     AND (storage.foldername(name))[1] = (auth.uid())::text);
-- CREATE POLICY "Users can upload receipts to own folder" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'receipts'
--     AND (storage.foldername(name))[1] = (auth.uid())::text);
