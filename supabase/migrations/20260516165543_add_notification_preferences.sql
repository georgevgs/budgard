-- Per-user notification preferences. Granular on/off switches for each
-- notification type the push cron emits (bill reminders, inactivity, weekly
-- recap, budget warnings, budget exceeded, debt payment).
--
-- Stored as JSONB so we can add new notification types without further
-- migrations. Missing key == enabled (default true): existing users with
-- '{}' get the full set, and any newly-shipped notification type starts
-- enabled until the user explicitly opts out.
--
-- Master push toggle is governed by push_subscriptions (a user with no
-- active subscription gets nothing regardless of this column). Daily
-- reminder remains toggled by user_budgets.daily_reminder_hour (NULL = off).

ALTER TABLE user_budgets
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_budgets.notification_preferences IS
  'Per-user notification opt-outs. Keys: bill_reminders, inactivity_nudge, weekly_recap, budget_warning, budget_exceeded, debt_payment. Missing key = enabled.';
