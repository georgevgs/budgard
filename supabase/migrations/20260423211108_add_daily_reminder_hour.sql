-- Daily reminder preference. NULL = disabled, 0-23 = UTC hour to send reminder.
ALTER TABLE user_budgets ADD COLUMN daily_reminder_hour SMALLINT DEFAULT NULL;

-- Constraint: valid hour range
ALTER TABLE user_budgets ADD CONSTRAINT valid_reminder_hour
  CHECK (daily_reminder_hour IS NULL OR (daily_reminder_hour >= 0 AND daily_reminder_hour <= 23));