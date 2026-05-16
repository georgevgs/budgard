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

type InactiveUser = {
  user_id: string;
};

type DailyReminderUser = {
  user_id: string;
};

type WeeklyRecapUser = {
  user_id: string;
  week_total: number;
  default_currency: string;
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

const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
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

    // Cron fires hourly (0 * * * *). Daily-reminder logic needs every-hour
    // resolution so it can match each user's chosen UTC hour. The other
    // batch jobs (recurring, inactivity, weekly, budget) only need to run
    // once a day — gate them to 08:00 UTC.

    const nowDate = new Date();
    const currentUtcHour = nowDate.getUTCHours();
    const isDailyBatchHour = currentUtcHour === 8;
    const isSundayUtc = nowDate.getUTCDay() === 0;

    if (isDailyBatchHour) {
      // ── Recurring expense reminders (due tomorrow) ─────────────────────

      const tomorrow = new Date(nowDate);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const { data: recurringDue, error: recurringError } =
        await adminClient.rpc('get_recurring_due_on', {
          p_target_date: tomorrowStr,
        });

      if (!recurringError && recurringDue) {
        for (const expense of recurringDue as RecurringDue[]) {
          const formatted = formatAmount(
            expense.amount,
            expense.default_currency,
          );
          notifications.push({
            user_id: expense.user_id,
            payload: {
              title: 'Heads up!',
              body: `${expense.description} (${formatted}) is coming for your wallet tomorrow.`,
              tag: `recurring-${expense.recurring_expense_id}`,
              data: { url: '/recurring' },
            },
          });
        }
      }

      // ── Recurring expense reminders (due in 3 days) ────────────────────
      // Separate tag from the T-1 nudge so the user sees both events.

      const inThreeDays = new Date(nowDate);
      inThreeDays.setUTCDate(inThreeDays.getUTCDate() + 3);
      const inThreeDaysStr = inThreeDays.toISOString().split('T')[0];

      const { data: recurringSoon, error: recurringSoonError } =
        await adminClient.rpc('get_recurring_due_on', {
          p_target_date: inThreeDaysStr,
        });

      if (!recurringSoonError && recurringSoon) {
        for (const expense of recurringSoon as RecurringDue[]) {
          const formatted = formatAmount(
            expense.amount,
            expense.default_currency,
          );
          notifications.push({
            user_id: expense.user_id,
            payload: {
              title: 'Heads up!',
              body: `${expense.description} (${formatted}) is due in 3 days — keep some room in your wallet.`,
              tag: `recurring-${expense.recurring_expense_id}-3d`,
              data: { url: '/recurring' },
            },
          });
        }
      }

      // ── Inactivity nudge (no expenses in 3 days) ───────────────────────

      const threeDaysAgo = new Date(nowDate);
      threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);
      const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

      const { data: inactiveUsers, error: inactiveError } =
        await adminClient.rpc('get_inactive_push_users', {
          p_since_date: threeDaysAgoStr,
        });

      if (!inactiveError && inactiveUsers) {
        for (const user of inactiveUsers as InactiveUser[]) {
          notifications.push({
            user_id: user.user_id,
            payload: {
              title: 'Where did you go?',
              body: "3 days with no expenses? Either you're on a no-spend streak or you forgot about me.",
              tag: 'inactivity-nudge',
              data: { url: '/expenses?action=add' },
            },
          });
        }
      }

      // ── Weekly recap (Sundays only) ────────────────────────────────────
      // Sends one "your week in review" nudge that opens the app to the
      // dashboard, where WeeklyRecapCard renders the per-category anomaly
      // breakdown. We compute only the totals here — the rich client-side
      // recap (top anomaly etc.) is calculated on render, so the push body
      // stays generic and the user gets the full picture in-app.

      if (isSundayUtc) {
        const todayStr = nowDate.toISOString().split('T')[0];

        const { data: weeklyUsers, error: weeklyError } = await adminClient.rpc(
          'get_weekly_recap_push_users',
          { p_window_end: todayStr },
        );

        if (!weeklyError && weeklyUsers) {
          for (const user of weeklyUsers as WeeklyRecapUser[]) {
            const formatted = formatAmount(
              Number(user.week_total),
              user.default_currency,
            );
            notifications.push({
              user_id: user.user_id,
              payload: {
                title: 'Your week in review',
                body: `${formatted} spent this week — open the app to see which categories swung the most.`,
                tag: 'weekly-recap',
                data: { url: '/expenses' },
              },
            });
          }
        }
      }

      // ── Budget crossed (monthly cap) ────────────────────────────────────
      // Fires only on the day total first crosses the cap (today >= cap,
      // yesterday < cap). Tag is month-scoped so multiple browsers/devices
      // collapse to one notification, and a later month re-fires cleanly.

      const todayStr = nowDate.toISOString().split('T')[0];
      const yesterday = new Date(nowDate);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const monthKey = todayStr.slice(0, 7); // YYYY-MM

      const { data: budgetCrossed, error: budgetError } =
        await adminClient.rpc('get_users_crossed_budget', {
          p_today: todayStr,
          p_yesterday: yesterdayStr,
        });

      if (!budgetError && budgetCrossed) {
        for (const row of budgetCrossed as BudgetCrossedUser[]) {
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
              title: 'Budget blown',
              body: `${spent} spent this month — you've passed your ${cap} cap.`,
              tag: `budget-exceeded-${monthKey}`,
              data: { url: '/expenses' },
            },
          });
        }
      }

      // ── Category budget crossed ────────────────────────────────────────

      const { data: catBudgetCrossed, error: catBudgetError } =
        await adminClient.rpc('get_users_crossed_category_budget', {
          p_today: todayStr,
          p_yesterday: yesterdayStr,
        });

      if (!catBudgetError && catBudgetCrossed) {
        for (const row of catBudgetCrossed as CategoryBudgetCrossedUser[]) {
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
              title: 'Category over budget',
              body: `${row.category_name} hit ${spent} — past your ${cap} cap.`,
              tag: `cat-budget-${row.category_id}-${monthKey}`,
              data: { url: '/expenses' },
            },
          });
        }
      }
    }

    // ── Daily reminder (user-selected hour, every hour) ──────────────────

    const { data: reminderUsers, error: reminderError } = await adminClient
      .from('user_budgets')
      .select('user_id')
      .eq('daily_reminder_hour', currentUtcHour);

    if (!reminderError && reminderUsers) {
      for (const user of reminderUsers as DailyReminderUser[]) {
        // Skip if we already have a notification queued for this user
        // (e.g., recurring reminder already covers today)
        const alreadyQueued = notifications.some(
          (n) => n.user_id === user.user_id,
        );
        if (alreadyQueued) continue;

        notifications.push({
          user_id: user.user_id,
          payload: {
            title: 'Cha-ching!',
            body: "Your wallet called — it wants receipts. Let's log today's expenses.",
            tag: 'daily-reminder',
            data: { url: '/expenses?action=add' },
          },
        });
      }
    }

    // ── Send notifications ───────────────────────────────────────────────

    let sent = 0;
    let failed = 0;
    const staleEndpoints: string[] = [];

    // Deduplicate by user_id — if a user has both a recurring reminder
    // and an inactivity nudge, send both (different tags prevent stacking).
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
