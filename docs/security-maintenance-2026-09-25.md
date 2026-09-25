# Security maintenance — 25 September 2026

Status: released. Netlify deploys the frontend from `main`; the five
migrations and three Edge Functions are on the linked project. Three
dashboard steps remain, under **Still to do**.

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
| F9 | Two receipts policies made in the dashboard, never in a migration, compared only the first folder segment with `auth.uid()`. Storage policies OR together, so they let a password session read and write its own folder past F1, and uploads skip the F4 quota. Found when the boundary suite first ran against the linked project. | `20260925140000` drops both, and fails if any receipts policy still skips `can_access_financial_space`. | 6 |

A trigger rejecting non-empty `auth.users.encrypted_password` was considered and
**rejected**. GoTrue creates every passwordless user with a random temporary
password, so it would have blocked every sign-up. For the same reason,
`encrypted_password <> ''` does not identify password accounts.

## Verification

| Check | Result |
| ----- | ------ |
| Lint, `tsc -b` | Pass |
| Unit and invariant tests | Pass: 208 files, 1,810 tests |
| Production build, bundle budgets | Pass, all five budgets |
| Edge Function typecheck against frozen locks (`edge:check`) | Pass, lockfiles unchanged |
| Knip | Pass, existing CSS hint only |
| SQL boundary suite, replayed schema | Pass on a local PG16 database rebuilt from the baseline plus every later migration |
| Playwright journeys | Pass: 98 tests, chromium and pwa-cache, with the new CSP applied |
| SQL boundary suite, linked project | Pass after `20260925140000`. Before it, failed at "Password session read receipts" (F9) |

Each new guard was mutation-checked: removing it made its test fail. That
covered the SQL password guard in `can_access_financial_space` and separately in
`accept_household_invite`, each quota, the server-side time stamp, the
second-subscription guard, the TS denylist and base64url decoding, the sign-out
releases, the foreign-endpoint detach, the Stripe listing's 400 handling and
terminal filter, the redirect allowlist and the service-worker URL guard. The
receipts-policy guard in `20260925140000` was checked by adding an unrelated
bypass policy, which it refused by name.

The SQL suite now signs in with realistic `amr` claims. It covers password
sessions, the full household lifecycle (invite, stranger, accept, partner
writes, forged creator, owner lapse, revoke, token reuse), the quotas and the
billing mirror.

## Deployment

Released 25 September 2026. The frontend and backend halves each work with
the other's previous version, so the order did not matter.

| Step | State |
| ---- | ----- |
| Migrations `20260925100000` to `20260925140000` | Applied to the linked project; history versions match the filenames |
| Edge Functions `delete-account`, `stripe-checkout`, `stripe-portal` | Deployed with `verify_jwt` kept. `stripe-webhook`, `send-push-notifications` and `stripe-prices` are unchanged, and no import map changed |
| Vault secret `send_push_notifications_cron_secret` | Created from the old job's command without the value leaving the database. The migration's job replaced it; the next run returned 200, and no job carries the secret in its command |
| Existing password sessions (`auth.mfa_amr_claims`) | Seven, each created and last used on its account's sign-up day: GoTrue's temporary password, not a sign-in. Refused by F1 and left in place |
| `security_boundaries.sql` on the linked project | Failed at "Password session read receipts" until `20260925140000`, passes after. The receipt-quota case also confirms the quota's definer function can count `storage.objects` |
| Frontend | Netlify, from `main`, CSP and COOP included |

### Still to do

1. **Rotate `CRON_SECRET`**, because the old value sat in plain text in
   `cron.job.command`. Run these back to back so no scheduled run falls
   between them:
   `supabase secrets set CRON_SECRET=<new>`, then
   `SELECT vault.update_secret((SELECT id FROM vault.secrets WHERE name = 'send_push_notifications_cron_secret'), '<new>');`
2. **Dashboard → Authentication → Email → Email OTP Expiration: 600.** This
   covers codes and links.
3. **Dashboard → Authentication → Attack Protection → Captcha protection on,
   provider Turnstile**, with the secret key set. Without it the client's
   `captchaToken` is ignored.

**Confirm email: on** is recommended but no longer load-bearing, because F1
refuses password sessions regardless. Before turning it on, make sure the
"Confirm signup" template includes `{{ .Token }}` or the link, since
first-time sign-ins will receive that template.

## Not done, and why

- **Pinning GitHub Actions to commit SHAs.** This session's GitHub access is
  limited to this repository, so the upstream SHAs for `actions/checkout`,
  `oven-sh/setup-bun` and `actions/upload-artifact` could not be resolved
  here. Both workflows already run with `contents: read` and no secrets.
- **Pinning the Sentry CSP host.** It depends on the DSN, which is a build
  secret. Replace `https://*.sentry.io` with the project's exact ingest host.
- **A retention job for `product_events`.** The daily cap bounds growth per
  account, but how long to keep analytics is a product decision.
