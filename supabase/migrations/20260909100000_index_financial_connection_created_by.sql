-- financial_connections.created_by references auth.users but has no index, so
-- an account deletion has to sequential-scan this table to apply the
-- ON DELETE SET NULL, and the advisor reports it as an unindexed foreign key.
-- The table is empty today, so this costs nothing now and buys the referential
-- action a lookup once bank connections carry real rows.
--
-- Partial: created_by is nullable and is NULL for every server-created row,
-- which is the shape this column will mostly have. Indexing only the rows that
-- name a creator keeps the index the size of the answer rather than the table.
--
-- Rollback: DROP INDEX public.financial_connections_created_by_idx;
CREATE INDEX financial_connections_created_by_idx
  ON public.financial_connections (created_by)
  WHERE created_by IS NOT NULL;
