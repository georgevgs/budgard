# Security maintenance — 25 September 2026

Status: on `main`. Netlify deploys the frontend from it; the four
migrations, three Edge Functions and four hosted settings are released by
hand, in the order under **Deployment**.

This follows the 12 September batch. That one hardened dependencies and push
delivery; this one closes the gaps between auth settings, the client and
billing that the follow-up audit found.

## What changed

| # | Finding | Fix | Batch |
| - | ------- | --- | ------ |
| F1 | Supabase accepts `auth.signUp({ email, password })` from the anon key although the app only signs in by email code or link. A password sign-up for someone else's address could claim a household invite (matched on JWT email alone), pre-register the account, delete it or open its billing portal. | Password and anonymous sessions (`amr`) are refused by `private.is_passwordless_session()` inside `can_access_financial_space`, the household policy and RPCs, and the push, notification and subscription policies. `_shared/sessionAssurance.ts` does the same in delete-account, stripe-checkout and stripe-portal. | 1 |
| F2 | Push subscriptions survived sign-out and "sign out everywhere": the device kept showing the previous account's bills, and the next person on that browser could not register (unique endpoint, RLS conflict). | Sign-out deletes this device's row, then unsubscribes locally; sign-out everywhere deletes every row. The settings switch only reads "on" when this account owns the endpoint, and replaces a foreign one before subscribing. | 2 |
| F3 | Email codes and links lived for an hour; verification is throttled per IP, not per code. | `config.toml` records 600 s. **The hosted value is a dashboard setting** — see below. | 1 |
| F4 | `feedback_reports`, `product_events` and the receipts bucket had no per-account ceiling. | Server-stamped, windowed caps: 5 feedback/hour and 20/day, 500 events/day, 2,000 receipts or 500 MB per financial space. | 3 |
| F5 | An unpaid or paused subscriber could open a second Stripe subscription; events from the two overwrote each other and delete-account cancelled only one. | Checkout returns `manage_billing` (the dialog opens the portal). Delete-account cancels every live subscription on the customer. `apply_subscription_event` no longer lets another subscription's stale event downgrade a live row. Billing redirects are only followed to `https://*.stripe.com`. | 4 |
| F6 | Sentry sampled 10 % of sessions for replay on SDK-default masking, and sent full URLs (invite tokens, PostgREST filters). | Replays only on error, masking spelled out; every URL in events, spans and breadcrumbs keeps its path only. | 5 |
| F7 | `CRON_SECRET` lived in plain text in `cron.job.command`, and the job existed only in the dashboard. | The job reads the secret from Vault and is defined in a migration. | 5 |
| F8 | Hardening. | CSP drops the unused font CDN and adds `object-src 'none'` and `frame-ancestors 'none'`; `Cross-Origin-Opener-Policy: same-origin`; the service worker only opens same-origin paths from a notification; `supabase/.temp/` is untracked. | 5 |

A trigger rejecting non-empty `auth.users.encrypted_password` was considered and
**rejected**. GoTrue creates every passwordless user with a random temporary
password, so it would have blocked every sign-up. For the same reason,
`encrypted_password <> ''` does not identify password accounts.

## Verification

| Check | Result |
| ----- | ------ |
| Lint, `tsc -b` | Pass |
| Unit and invariant tests | Pass: 203 files, 1,791 tests |
| Production build, bundle budgets | Pass, all five budgets |
| Edge Function typecheck against frozen locks (`edge:check`) | Pass, lockfiles unchanged |
| Knip | Pass, existing CSS hint only |
| SQL boundary suite, replayed schema | Pass on a local PG16 database rebuilt from the baseline plus every later migration |
| Playwright journeys | Pass: 98 tests, chromium and pwa-cache, with the new CSP applied |
| SQL boundary suite, linked project | **Not run** — needs the backup credentials (see 12 September note) |

Each new guard was mutation-checked: removing it made its test fail. That
covered the SQL password guard in `can_access_financial_space` and separately in
`accept_household_invite`, each quota, the server-side time stamp, the
second-subscription guard, the TS denylist and base64url decoding, the sign-out
releases, the foreign-endpoint detach, the Stripe listing's 400 handling and
terminal filter, the redirect allowlist and the service-worker URL guard.

The SQL suite now signs in with realistic `amr` claims. It covers password
sessions, the full household lifecycle (invite, stranger, accept, partner
writes, forged creator, owner lapse, revoke, token reuse), the quotas and the
billing mirror.

## Deployment

The frontend and backend halves each work with the other's previous version,
so either can go first. Netlify ships the frontend on every push to `main`.

1. **Migrations** (`supabase db push`), in filename order:
   `20260925100000_reject_password_sessions`,
   `20260925110000_bound_client_writes`,
   `20260925120000_guard_second_subscription_events`,
   `20260925130000_read_push_cron_secret_from_vault` (see step 3 first).
2. **Edge Functions**, keeping each one's `verify_jwt`: `delete-account`,
   `stripe-checkout`, `stripe-portal`. `stripe-webhook`,
   `send-push-notifications` and `stripe-prices` are unchanged. No import map
   changed, so no lock regeneration was needed.
3. **Vault, before the last migration.** In the SQL editor:
   `SELECT vault.create_secret('<current CRON_SECRET>', 'send_push_notifications_cron_secret');`
   If the migration was already applied without it, it raised a WARNING and
   changed nothing. Create the secret, then run the migration's `DO` block by
   hand. Afterwards rotate the secret, because the old one sat in plain text:
   `supabase secrets set CRON_SECRET=<new>` and `vault.update_secret(...)`
   back to back. Confirm with `SELECT jobname, schedule FROM cron.job;`:
   there should be exactly one job calling the function, and no secret in its
   command.
4. **Hosted Auth settings** (Dashboard → Authentication):
   - Email → **Email OTP Expiration: 600**. This covers codes and links.
   - Attack Protection → **Captcha protection on, provider Turnstile**, with
     the secret key set. Without it the client's `captchaToken` is ignored.
   - Email → **Confirm email: on** is recommended but no longer load-bearing,
     because F1 refuses password sessions regardless. Before turning it on,
     make sure the "Confirm signup" template includes `{{ .Token }}` or the
     link, since first-time sign-ins will receive that template.
5. **Check for existing password sessions.** GoTrue records each session's
   methods in `auth.mfa_amr_claims`:
   ```sql
   SELECT s.user_id, c.created_at
   FROM auth.mfa_amr_claims AS c
   JOIN auth.sessions AS s ON s.id = c.session_id
   WHERE c.authentication_method = 'password';
   ```
   This should return no rows. Any rows it does return are already refused by
   step 1. Review them, then revoke with
   `DELETE FROM auth.sessions WHERE id IN (...)`.
6. **Run `supabase/tests/security_boundaries.sql`** against the linked project.
   The receipt-quota case also confirms that the quota's definer function can
   count `storage.objects`; if it passes, the project's `postgres` role
   bypasses RLS there as expected.
7. **Frontend**: deployed by Netlify from `main`, CSP and COOP included. Confirm the live build carries the new release.

## Not done, and why

- **Pinning GitHub Actions to commit SHAs.** This session's GitHub access is
  limited to this repository, so the upstream SHAs for `actions/checkout`,
  `oven-sh/setup-bun` and `actions/upload-artifact` could not be resolved
  here. Both workflows already run with `contents: read` and no secrets.
- **Pinning the Sentry CSP host.** It depends on the DSN, which is a build
  secret. Replace `https://*.sentry.io` with the project's exact ingest host.
- **A retention job for `product_events`.** The daily cap bounds growth per
  account, but how long to keep analytics is a product decision.
