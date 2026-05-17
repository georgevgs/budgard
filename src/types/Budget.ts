// Granular per-user notification toggles. Missing key = enabled (so existing
// users with '{}' get the full set, and any newly-added type defaults on).
export type NotificationPreferenceKey =
  | 'bill_reminders'
  | 'budget_exceeded'
  | 'debt_payment';

export type NotificationPreferences = Partial<
  Record<NotificationPreferenceKey, boolean>
>;

export type Budget = {
  id: string;
  user_id: string;
  monthly_amount: number;
  default_currency: string;
  daily_reminder_hour: number | null;
  default_savings_pct: number | null;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
};

export type BudgetFormData = {
  amount: string;
};
