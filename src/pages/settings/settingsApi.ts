import { supabase } from '@/config/supabase';
import { maybeRow, row } from '@/config/supabaseCrud';
import type { Budget, NotificationPreferences, NotificationSettings } from '@/types/Budget';

// Supabase queries for settings, at the feature root so an audit of what
// this feature reads and writes is one file.
export const settingsApi = {
  async getUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;

    return user;
  },

  async updateDefaultCurrency(currency: string, ownerId: string) {
    return row<Budget>(
      supabase
        .from('user_budgets')
        .upsert(
          { user_id: ownerId, default_currency: currency },
          { onConflict: 'user_id' },
        )
        .select(
          'id, user_id, monthly_amount, default_savings_pct, default_currency, created_at, updated_at',
        )
        .maybeSingle(),
    );
  },

  async updateDefaultSavingsPct(pct: number | null, ownerId: string) {
    return row<Budget>(
      supabase
        .from('user_budgets')
        .upsert(
          { user_id: ownerId, default_savings_pct: pct },
          { onConflict: 'user_id' },
        )
        .select(
          'id, user_id, monthly_amount, default_savings_pct, default_currency, created_at, updated_at',
        )
        .maybeSingle(),
    );
  },

  async updateDailyReminderHour(hour: number | null) {
    // Read the user id from the local session — no network round trip.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    return row<NotificationSettings>(
      supabase
        .from('user_notification_settings')
        .upsert(
          { user_id: session.user.id, daily_reminder_hour: hour },
          { onConflict: 'user_id' },
        )
        .select()
        .maybeSingle(),
    );
  },

  async updateNotificationPreferences(prefs: NotificationPreferences) {
    // Read the user id from the local session — no network round trip.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    return row<NotificationSettings>(
      supabase
        .from('user_notification_settings')
        .upsert(
          { user_id: session.user.id, notification_preferences: prefs },
          { onConflict: 'user_id' },
        )
        .select()
        .maybeSingle(),
    );
  },

  async getNotificationSettings(signal?: AbortSignal) {
    let query = supabase.from('user_notification_settings').select('*');
    if (signal) query = query.abortSignal(signal);

    return maybeRow<NotificationSettings>(query.maybeSingle());
  },
};
