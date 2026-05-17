-- Drop unused push-notification helper RPCs.
-- After the May 2026 trim of low-value notifications (inactivity nudge,
-- weekly recap push), these helpers are no longer called by the
-- send-push-notifications edge function. The in-app WeeklyRecapCard
-- (src/hooks/useWeeklyRecap.ts) is computed client-side and does not
-- depend on these RPCs.

DROP FUNCTION IF EXISTS public.get_inactive_push_users(DATE);
DROP FUNCTION IF EXISTS public.get_weekly_recap_push_users(DATE);
