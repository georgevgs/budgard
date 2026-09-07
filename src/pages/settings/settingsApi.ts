import { supabase } from '@/config/supabase';
import { done, maybeRow, row, rows } from '@/common/api/supabaseCrud';
import type { Budget, NotificationPreferences, NotificationSettings } from '@/types/Budget';
import type { FinancialConnection } from '@/pages/settings/settingsTypes';

export type PushSubscriptionPayload = {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// The connection row carries provider credentials the client must never read.
// Naming the safe columns is what keeps a `select('*')` from leaking them.
const SAFE_CONNECTION_COLUMNS = [
  'id',
  'user_id',
  'provider',
  'institution_name',
  'status',
  'last_synced_at',
  'last_error_code',
  'created_at',
  'updated_at',
].join(',');

// Supabase queries for settings, at the feature root so an audit of what
// this feature reads and writes is one file.
export const settingsApi = {
  async getUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }

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
    if (!session) {
      throw new Error('Not authenticated');
    }

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
    if (!session) {
      throw new Error('Not authenticated');
    }

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
    if (signal) {
      query = query.abortSignal(signal);
    }

    return maybeRow<NotificationSettings>(query.maybeSingle());
  },

  async savePushSubscription({
    userId,
    endpoint,
    p256dh,
    auth,
  }: PushSubscriptionPayload): Promise<void> {
    await done(
      supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
        },
        { onConflict: 'endpoint' },
      ),
    );
  },

  async removePushSubscription(endpoint: string): Promise<void> {
    await done(
      supabase.from('push_subscriptions').delete().eq('endpoint', endpoint),
    );
  },

  async getFinancialConnections(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('financial_connections')
      .select(SAFE_CONNECTION_COLUMNS)
      .eq('user_id', ownerId)
      .order('created_at');
    if (signal) {
      query = query.abortSignal(signal);
    }

    return rows<FinancialConnection>(query);
  },
};
