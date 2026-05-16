-- Make the `receipts` bucket SELECT / INSERT / DELETE policies reproducible
-- from migrations. The UPDATE policy was already migration-controlled (see
-- 20260515181535_fix_receipts_update_with_check); the other three were only
-- set via the Supabase Dashboard, so a clean restore from migrations alone
-- would have lost them.
--
-- All four policies share the same shape: confine each authenticated user to
-- objects under their own UUID folder, matched by the first path segment.

DROP POLICY IF EXISTS "Users can read own receipts" ON storage.objects;

CREATE POLICY "Users can read own receipts" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can insert own receipts" ON storage.objects;

CREATE POLICY "Users can insert own receipts" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;

CREATE POLICY "Users can delete own receipts" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
