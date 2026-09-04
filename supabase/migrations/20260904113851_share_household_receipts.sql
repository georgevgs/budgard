-- Receipt paths use the financial-space owner's UUID as their first folder
-- segment. Household members can already read and mutate the corresponding
-- expense row, so Storage must enforce the same shared-space predicate or the
-- attachment becomes inaccessible as soon as a partner is active.
--
-- The CASE validates the folder before casting it. Storage may contain legacy
-- or administrative object names, and one malformed first segment must not
-- make every list/read query fail with invalid_text_representation.

DROP POLICY IF EXISTS "Users can read own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Household can read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Household can insert receipts" ON storage.objects;
DROP POLICY IF EXISTS "Household can update receipts" ON storage.objects;
DROP POLICY IF EXISTS "Household can delete receipts" ON storage.objects;

CREATE POLICY "Household can read receipts" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND private.can_access_financial_space(
      CASE
        WHEN (storage.foldername(name))[1] ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END
    )
  );

CREATE POLICY "Household can insert receipts" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND private.can_access_financial_space(
      CASE
        WHEN (storage.foldername(name))[1] ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END
    )
  );

CREATE POLICY "Household can update receipts" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND private.can_access_financial_space(
      CASE
        WHEN (storage.foldername(name))[1] ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END
    )
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND private.can_access_financial_space(
      CASE
        WHEN (storage.foldername(name))[1] ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END
    )
  );

CREATE POLICY "Household can delete receipts" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND private.can_access_financial_space(
      CASE
        WHEN (storage.foldername(name))[1] ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(name))[1])::uuid
        ELSE NULL
      END
    )
  );
