import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://budgard.com',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type RecurringDue = {
  user_id: string;
  recurring_expense_id: string;
  description: string;
  amount: number;
  default_currency: string;
};

type DailyReminderUser = {
  user_id: string;
};

type BudgetCrossedUser = {
  user_id: string;
  monthly_amount: number;
  current_total: number;
  default_currency: string;
};

type CategoryBudgetCrossedUser = {
  user_id: string;
  category_id: string;
  category_name: string;
  monthly_amount: number;
  current_total: number;
  default_currency: string;
};

type DebtDue = {
  user_id: string;
  debt_id: string;
  debt_name: string;
  minimum_payment: number;
  currency: string;
};

type PushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type NotificationPayload = {
  user_id: string;
  payload: {
    title: string;
    body: string;
    tag: string;
    data: { url: string };
  };
};

// Mirrors the client-side type in src/types/Budget.ts.
type NotificationPreferenceKey =
  | 'bill_reminders'
  | 'budget_warning'
  | 'budget_exceeded'
  | 'debt_payment';

type PreferencesByUser = Map<string, Record<string, boolean>>;

// Default UTC hour for users who haven't picked a daily-reminder time.
// Matches the historical batch hour so existing users see no shift.
const DEFAULT_BATCH_HOUR_UTC = 8;

const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
};

// Missing key == enabled. Mirrors the client-side default so a user with no
// stored preferences keeps receiving every notification type.
const isEnabled = (
  prefsByUser: PreferencesByUser,
  userId: string,
  key: NotificationPreferenceKey,
): boolean => {
  const prefs = prefsByUser.get(userId);
  if (!prefs) return true;
  if (prefs[key] === false) return false;

  return true;
};

const formatAmount = (amount: number, currency: string): string => {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate via cron secret (not user JWT — called by pg_cron)
    const authHeader = req.headers.get('Authorization') ?? '';
    const cronSecret = Deno.env.get('CRON_SECRET');

    if (!cronSecret || !constantTimeEqual(authHeader, `Bearer ${cronSecret}`)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidSubject =
      Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@budgard.com';

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const notifications: NotificationPayload[] = [];

    // Cron fires hourly (0 * * * *). Each batch block runs at the user's
    // preferred UTC hour (their daily_reminder_hour) so non-UTC users don't
    // get pinged at midnight. Users without a stored hour fall back to 08:00.

    const nowDate = new Date();
    const currentUtcHour = nowDate.getUTCHours();
    const todayStr = nowDate.toISOString().split('T')[0];
    const monthKey = todayStr.slice(0, 7); // YYYY-MM

    // One query for both notification toggles and preferred hour.
    const prefsByUser: PreferencesByUser = new Map();
    const preferredHourByUser = new Map<string, number>();
    {
      const { data: budgetRows } = await adminClient
        .from('user_budgets')
        .select('user_id, notification_preferences, daily_reminder_hour');

      if (budgetRows) {
        for (const row of budgetRows as Array<{
          user_id: string;
          notification_preferences: Record<string, boolean> | null;
          daily_reminder_hour: number | null;
        }>) {
          prefsByUser.set(row.user_id, row.notification_preferences ?? {});
          if (row.daily_reminder_hour !== null) {
            preferredHourByUser.set(row.user_id, row.daily_reminder_hour);
          }
        }
      }
    }

    const matchesPreferredHour = (userId: string): boolean => {
      const hour = preferredHourByUser.get(userId) ?? DEFAULT_BATCH_HOUR_UTC;

      return hour === currentUtcHour;
    };

    // ── Recurring expense reminders (due tomorrow) ───────────────────────
    // When ≥3 bills fall on the same day for a user, bundle into a single
    // push (e.g. "3 bills due tomorrow — €X total") to avoid stacking up to
    // a dozen notifications on the 1st of the month. Below the threshold,
    // keep one-push-per-bill so each is tappable on its own.

    const tomorrow = new Date(nowDate);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const BILL_BUNDLE_THRESHOLD = 3;

    const { data: recurringDue, error: recurringError } = await adminClient.rpc(
      'get_recurring_due_on',
      { p_target_date: tomorrowStr },
    );

    if (!recurringError && recurringDue) {
      const billsByUser = new Map<string, RecurringDue[]>();

      for (const expense of recurringDue as RecurringDue[]) {
        if (!matchesPreferredHour(expense.user_id)) continue;
        if (!isEnabled(prefsByUser, expense.user_id, 'bill_reminders')) {
          continue;
        }
        const list = billsByUser.get(expense.user_id) ?? [];
        list.push(expense);
        billsByUser.set(expense.user_id, list);
      }

      for (const [userId, bills] of billsByUser) {
        if (bills.length >= BILL_BUNDLE_THRESHOLD) {
          const total = bills.reduce((sum, b) => sum + Number(b.amount), 0);
          const formatted = formatAmount(total, bills[0].default_currency);
          notifications.push({
            user_id: userId,
            payload: {
              title: `${bills.length} bills due tomorrow`,
              body: `${formatted} total scheduled for tomorrow.`,
              tag: `bills-bundled-${tomorrowStr}`,
              data: { url: '/recurring' },
            },
          });
          continue;
        }

        for (const expense of bills) {
          const formatted = formatAmount(
            expense.amount,
            expense.default_currency,
          );
          notifications.push({
            user_id: expense.user_id,
            payload: {
              title: `${expense.description} due tomorrow`,
              body: `${formatted} scheduled for tomorrow.`,
              tag: `bill-${expense.recurring_expense_id}`,
              data: { url: '/recurring' },
            },
          });
        }
      }
    }

    // ── Debt payment due tomorrow ────────────────────────────────────────

    const { data: debtsDue, error: debtsDueError } = await adminClient.rpc(
      'get_debt_payments_due_on',
      { p_target_date: tomorrowStr },
    );

    if (!debtsDueError && debtsDue) {
      for (const debt of debtsDue as DebtDue[]) {
        if (!matchesPreferredHour(debt.user_id)) continue;
        if (!isEnabled(prefsByUser, debt.user_id, 'debt_payment')) continue;
        const formatted = formatAmount(debt.minimum_payment, debt.currency);
        notifications.push({
          user_id: debt.user_id,
          payload: {
            title: `${debt.debt_name} payment tomorrow`,
            body: `Minimum ${formatted} due — log it to keep the payoff plan on track.`,
            tag: `debt-${debt.debt_id}`,
            data: { url: '/debts' },
          },
        });
      }
    }

    // ── Budget crossed (monthly cap) ─────────────────────────────────────
    // Fires only on the day total first crosses the cap (today >= cap,
    // yesterday < cap). Tag is month-scoped so a re-run replaces rather
    // than re-pings, and a new month re-fires cleanly.

    const yesterday = new Date(nowDate);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const usersWithMonthlyCrossed = new Set<string>();

    const { data: budgetCrossed, error: budgetError } = await adminClient.rpc(
      'get_users_crossed_budget',
      { p_today: todayStr, p_yesterday: yesterdayStr },
    );

    if (!budgetError && budgetCrossed) {
      for (const row of budgetCrossed as BudgetCrossedUser[]) {
        if (!matchesPreferredHour(row.user_id)) continue;
        if (!isEnabled(prefsByUser, row.user_id, 'budget_exceeded')) continue;
        usersWithMonthlyCrossed.add(row.user_id);
        const spent = formatAmount(
          Number(row.current_total),
          row.default_currency,
        );
        const cap = formatAmount(
          Number(row.monthly_amount),
          row.default_currency,
        );
        notifications.push({
          user_id: row.user_id,
          payload: {
            title: 'Monthly budget reached',
            body: `${spent} spent — you've passed your ${cap} cap.`,
            tag: `budget-${monthKey}`,
            data: { url: '/expenses' },
          },
        });
      }
    }

    // ── Category budget crossed ──────────────────────────────────────────
    // Suppressed for users who also crossed the monthly cap today — the
    // same spending event typically tips both, and the user is heading to
    // /expenses anyway where each category is visible. Avoids a stack of
    // simultaneous pushes at month-end.

    const { data: catBudgetCrossed, error: catBudgetError } =
      await adminClient.rpc('get_users_crossed_category_budget', {
        p_today: todayStr,
        p_yesterday: yesterdayStr,
      });

    if (!catBudgetError && catBudgetCrossed) {
      for (const row of catBudgetCrossed as CategoryBudgetCrossedUser[]) {
        if (!matchesPreferredHour(row.user_id)) continue;
        if (!isEnabled(prefsByUser, row.user_id, 'budget_exceeded')) continue;
        if (usersWithMonthlyCrossed.has(row.user_id)) continue;
        const spent = formatAmount(
          Number(row.current_total),
          row.default_currency,
        );
        const cap = formatAmount(
          Number(row.monthly_amount),
          row.default_currency,
        );
        notifications.push({
          user_id: row.user_id,
          payload: {
            title: `${row.category_name} over budget`,
            body: `${spent} spent — past your ${cap} cap.`,
            tag: `cat-budget-${row.category_id}-${monthKey}`,
            data: { url: '/expenses' },
          },
        });
      }
    }

    // ── Budget approaching 80% (monthly cap) ─────────────────────────────
    // Early-warning the day the user first crosses 80% of cap. The RPC
    // excludes anyone who *also* crossed 100% today so the "blown" alert
    // above wins and we don't double-ping.

    const { data: budgetApproaching, error: budgetApproachingError } =
      await adminClient.rpc('get_users_approaching_budget', {
        p_today: todayStr,
        p_yesterday: yesterdayStr,
      });

    if (!budgetApproachingError && budgetApproaching) {
      for (const row of budgetApproaching as BudgetCrossedUser[]) {
        if (!matchesPreferredHour(row.user_id)) continue;
        if (!isEnabled(prefsByUser, row.user_id, 'budget_warning')) continue;
        const spent = formatAmount(
          Number(row.current_total),
          row.default_currency,
        );
        const cap = formatAmount(
          Number(row.monthly_amount),
          row.default_currency,
        );
        notifications.push({
          user_id: row.user_id,
          payload: {
            title: 'Monthly budget at 80%',
            body: `${spent} of your ${cap} cap spent — still some month to go.`,
            tag: `budget-warning-${monthKey}`,
            data: { url: '/expenses' },
          },
        });
      }
    }

    // ── Category budget approaching 80% ──────────────────────────────────

    const { data: catBudgetApproaching, error: catBudgetApproachingError } =
      await adminClient.rpc('get_users_approaching_category_budget', {
        p_today: todayStr,
        p_yesterday: yesterdayStr,
      });

    if (!catBudgetApproachingError && catBudgetApproaching) {
      for (const row of catBudgetApproaching as CategoryBudgetCrossedUser[]) {
        if (!matchesPreferredHour(row.user_id)) continue;
        if (!isEnabled(prefsByUser, row.user_id, 'budget_warning')) continue;
        const spent = formatAmount(
          Number(row.current_total),
          row.default_currency,
        );
        const cap = formatAmount(
          Number(row.monthly_amount),
          row.default_currency,
        );
        notifications.push({
          user_id: row.user_id,
          payload: {
            title: `${row.category_name} at 80%`,
            body: `${spent} of your ${cap} cap spent.`,
            tag: `cat-budget-warning-${row.category_id}-${monthKey}`,
            data: { url: '/expenses' },
          },
        });
      }
    }

    // ── Daily reminder (user-selected hour) ──────────────────────────────
    // Only fires if no other notification is already queued for this user
    // this run — keeps the engagement nudge from layering on top of bills.

    const { data: reminderUsers, error: reminderError } = await adminClient
      .from('user_budgets')
      .select('user_id')
      .eq('daily_reminder_hour', currentUtcHour);

    if (!reminderError && reminderUsers) {
      for (const user of reminderUsers as DailyReminderUser[]) {
        const alreadyQueued = notifications.some(
          (n) => n.user_id === user.user_id,
        );
        if (alreadyQueued) continue;

        notifications.push({
          user_id: user.user_id,
          payload: {
            title: 'Log today',
            body: 'A minute now keeps your numbers honest. Tap to add an expense.',
            tag: 'daily-reminder',
            data: { url: '/expenses?action=add' },
          },
        });
      }
    }

    // ── Send notifications ───────────────────────────────────────────────
    // One push per event. The OS (Chrome on Android, Safari on iOS) groups
    // notifications from the same origin in the tray; distinct tags keep
    // each item separately tappable to its own destination.

    let sent = 0;
    let failed = 0;
    const staleEndpoints: string[] = [];

    for (const notification of notifications) {
      const { data: subscriptions } = await adminClient
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', notification.user_id);

      if (!subscriptions || subscriptions.length === 0) continue;

      for (const sub of subscriptions as PushSubscription[]) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };

        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(notification.payload),
          );
          sent++;
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          // 410 Gone or 404 = subscription expired/invalid
          if (statusCode === 410 || statusCode === 404) {
            staleEndpoints.push(sub.endpoint);
          }
          failed++;
        }
      }
    }

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await adminClient
        .from('push_subscriptions')
        .delete()
        .in('endpoint', staleEndpoints);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        stale_cleaned: staleEndpoints.length,
        notifications_evaluated: notifications.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('send-push-notifications error:', err);

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
