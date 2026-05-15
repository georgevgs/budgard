-- Add WITH CHECK to the storage UPDATE policy on the `receipts` bucket.
--
-- The existing policy validates USING (folder == auth.uid()), which only
-- restricts which rows a user can target. Without WITH CHECK, an authenticated
-- user can update an object's `name` to move it into another user's folder
-- (e.g. set name = '<otherUserUuid>/file.webp'). Adding WITH CHECK enforces
-- that the new row state also lives under the caller's folder.

DROP POLICY IF EXISTS "Users can update own receipts" ON storage.objects;

CREATE POLICY "Users can update own receipts" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
