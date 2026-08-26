-- Which Today tiles do people actually keep?
--
-- Run these in the Supabase SQL editor (they are read-only). The Today layout
-- follows the account in `user_ui_preferences`, so what users hide is real
-- usage data the app is already collecting and nobody is reading.
--
-- IMPORTANT — who is in this table: a row is written only when someone
-- CHANGES their layout. Users happy with the default never appear. So these
-- numbers describe people who rearranged Today, not the whole user base, and
-- the denominators below say so explicitly. Treat a tile hidden by most
-- *rearrangers* as a deletion candidate, not proof the median user dislikes it.


-- 1. How many accounts have ever customised Today at all.
--    This is the denominator for everything below.
SELECT
  (SELECT count(*) FROM public.user_ui_preferences) AS accounts_with_custom_layout,
  (SELECT count(*) FROM auth.users)                 AS accounts_total;


-- 2. Per tile: kept vs hidden, among accounts that customised.
--    `share_hidden` is the number to sort by — a tile most rearrangers
--    actively removed is the strongest candidate for deletion.
WITH prefs AS (
  SELECT user_id, today_visible, today_hidden
  FROM public.user_ui_preferences
),
total AS (SELECT count(*)::numeric AS n FROM prefs),
tiles AS (
  SELECT unnest(ARRAY[
    'safeToSpend', 'budgetUsed', 'monthPace', 'upcoming', 'topCategory',
    'insight', 'recentActivity', 'weeklyRecap', 'netWorth', 'debts'
  ]) AS tile
)
SELECT
  t.tile,
  count(*) FILTER (WHERE t.tile = ANY(p.today_visible)) AS kept,
  count(*) FILTER (WHERE t.tile = ANY(p.today_hidden))  AS hidden,
  round(
    100.0 * count(*) FILTER (WHERE t.tile = ANY(p.today_hidden)) / nullif((SELECT n FROM total), 0),
    1
  ) AS share_hidden
FROM tiles t
CROSS JOIN prefs p
GROUP BY t.tile
ORDER BY share_hidden DESC NULLS LAST;


-- 3. Where a kept tile actually sits. A tile people keep but always push to
--    the bottom is not earning its place either — that is a demotion
--    candidate rather than a deletion one.
WITH prefs AS (SELECT today_visible FROM public.user_ui_preferences)
SELECT
  tile,
  count(*)                     AS kept_by,
  round(avg(position), 2)      AS avg_position,
  min(position)                AS best_position
FROM prefs, unnest(today_visible) WITH ORDINALITY AS v(tile, position)
GROUP BY tile
ORDER BY avg_position;


-- 4. How many tiles people keep. If the median is well below the ten on
--    offer, the grid is bigger than anyone wants it to be.
SELECT
  cardinality(today_visible) AS tiles_kept,
  count(*)                   AS accounts
FROM public.user_ui_preferences
GROUP BY tiles_kept
ORDER BY tiles_kept;


-- 5. Tiles hidden despite being on by default. These were switched OFF
--    deliberately — the clearest negative signal in the table.
WITH prefs AS (SELECT today_hidden FROM public.user_ui_preferences),
defaults AS (
  SELECT unnest(ARRAY[
    'safeToSpend', 'budgetUsed', 'monthPace', 'upcoming',
    'topCategory', 'insight', 'recentActivity'
  ]) AS tile
)
SELECT d.tile, count(*) AS turned_off_by
FROM defaults d
JOIN prefs p ON d.tile = ANY(p.today_hidden)
GROUP BY d.tile
ORDER BY turned_off_by DESC;


-- 6. Tiles switched ON despite being off by default (weeklyRecap, netWorth,
--    debts). Demand for something the default hides.
WITH prefs AS (SELECT today_visible FROM public.user_ui_preferences),
off_by_default AS (
  SELECT unnest(ARRAY['weeklyRecap', 'netWorth', 'debts']) AS tile
)
SELECT o.tile, count(*) AS turned_on_by
FROM off_by_default o
JOIN prefs p ON o.tile = ANY(p.today_visible)
GROUP BY o.tile
ORDER BY turned_on_by DESC;
