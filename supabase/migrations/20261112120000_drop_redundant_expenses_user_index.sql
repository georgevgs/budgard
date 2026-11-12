-- idx_expenses_user_id (user_id) is a strict prefix of
-- expenses_user_type_date_idx (user_id, type, date DESC) and of the history
-- and review indexes that also lead with user_id. Any lookup or foreign-key
-- check it served is served by those, so it only added a write to every
-- insert, update and delete on the busiest table.
--
-- expenses_date_idx (date) is NOT dropped here. Nothing in the app filters on
-- date alone, but the cross-user push helpers might use it. Check
-- pg_stat_user_indexes.idx_scan on production before removing that one.

DROP INDEX IF EXISTS public.idx_expenses_user_id;

-- Rollback:
-- CREATE INDEX idx_expenses_user_id ON public.expenses (user_id);
