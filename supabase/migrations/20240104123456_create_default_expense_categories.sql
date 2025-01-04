-- Create a function to generate default categories for each new user
CREATE OR REPLACE FUNCTION public.create_default_categories_for_user()
RETURNS TRIGGER AS $$
DECLARE
default_categories TEXT[][] := ARRAY[
        -- Essential Expenses
        ARRAY['Housing', '#4A90E2'],          -- Blue
        ARRAY['Utilities', '#2ECC71'],        -- Green
        ARRAY['Food', '#F39C12'],             -- Orange
        ARRAY['Transportation', '#9B59B6'],   -- Purple
        ARRAY['Healthcare', '#1ABC9C'],       -- Teal

        -- Lifestyle Expenses
        ARRAY['Entertainment', '#E67E22'],    -- Dark Orange
        ARRAY['Shopping', '#F1C40F'],         -- Yellow
        ARRAY['Personal Care', '#3498DB'],    -- Bright Blue

        -- Additional Expenses
        ARRAY['Subscriptions', '#E74C3C'],    -- Red
        ARRAY['Miscellaneous', '#95A5A6']     -- Gray
    ];
    category_info TEXT[];
BEGIN
    -- Loop through default categories and insert for the new user
    FOREACH category_info SLICE 1 IN ARRAY default_categories
    LOOP
        INSERT INTO public.categories (
            name,
            user_id,
            created_at,
            color
        ) VALUES (
            category_info[1],
            NEW.id,  -- Use the new user's ID
            NOW(),
            category_info[2]  -- Add a default color
        );
END LOOP;

RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically add default categories when a new user is created
CREATE OR REPLACE TRIGGER create_default_categories_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_default_categories_for_user();