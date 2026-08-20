-- Pin search_path on the last SECURITY DEFINER function that lacked it.
--
-- create_default_categories_for_user() has run with a mutable search_path
-- since 20240104123456, and the 20260218000000 recolour carried the omission
-- forward. Every other SECURITY DEFINER function in this schema sets it.
--
-- Exploitability was low rather than nil: the function is an AFTER INSERT
-- trigger on auth.users, so the only session that fires it is GoTrue's, and
-- an attacker never gets to choose the search_path it runs under. The INSERT
-- target is schema-qualified and now() resolves out of pg_catalog, which is
-- implicitly first. So this closes a linter finding and removes a trap for
-- whoever edits the body next — it is not a fix for a live hole.
--
-- Body is byte-identical to 20260218000000; only the function attributes
-- change. Re-stating the whole thing is unavoidable: CREATE OR REPLACE has no
-- attribute-only form, and ALTER FUNCTION ... SET search_path would leave the
-- two definitions disagreeing in the migration history.

CREATE OR REPLACE FUNCTION public.create_default_categories_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
default_categories TEXT[][] := ARRAY[
        -- Essential Expenses
        ARRAY['Housing', '#3b82f6'],        -- blue-500
        ARRAY['Utilities', '#06b6d4'],      -- cyan-500
        ARRAY['Food', '#f97316'],           -- orange-500
        ARRAY['Transportation', '#6366f1'], -- indigo-500
        ARRAY['Healthcare', '#10b981'],     -- emerald-500

        -- Lifestyle Expenses
        ARRAY['Entertainment', '#a855f7'],  -- purple-500
        ARRAY['Shopping', '#f43f5e'],       -- rose-500
        ARRAY['Personal Care', '#ec4899'],  -- pink-500

        -- Additional Expenses
        ARRAY['Subscriptions', '#eab308'],  -- amber-500
        ARRAY['Miscellaneous', '#64748b']   -- slate-500
    ];
    category_info TEXT[];
BEGIN
    FOREACH category_info SLICE 1 IN ARRAY default_categories
    LOOP
        INSERT INTO public.categories (
            name,
            user_id,
            created_at,
            color
        ) VALUES (
            category_info[1],
            NEW.id,
            NOW(),
            category_info[2]
        );
END LOOP;

RETURN NEW;
END;
$$;
