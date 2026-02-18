-- Update default category colors to use the modern Tailwind 500-weight palette.
-- These colors are vivid enough to pop at small sizes (left strips, dots, progress bars)
-- while remaining refined and consistent across light and dark themes.
CREATE OR REPLACE FUNCTION public.create_default_categories_for_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
