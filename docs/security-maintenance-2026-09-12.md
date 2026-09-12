# Security maintenance — 12 September 2026

Status: implementation, verification, the database migration and the Edge
Function deployment are complete. The frontend release and one hosted Auth
setting remain. The backend changes are live; the frontend changes in this batch
ship with the next Netlify deploy.

## Completed locally

- Updated 26 existing direct dependencies in security, runtime and tooling batches,
  including Vitest 5.0.0, Vite 8.2.2, Supabase JS 2.115.0 and CLI 2.116.0.
  Added pinned Deno 2.9.6 for repeatable Edge Function checks.
- Removed the installed Vitest / mocker version affected by
  [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).
  The final root dependency audit returned no published advisories, and
  `audit:edges` now covers the separate Deno dependency graphs as well.
- Restricted push delivery to HTTPS endpoints at the supported Google, Mozilla,
  Apple and Windows push services. Reject credentials, alternate ports, local
  addresses, unrecognized hosts, whitespace and malformed subscription keys.
  Allow a colon in the path for FCM registration tokens.
- Added a five-second delivery timeout and a ten-device per-user limit. The
  migration enforces the endpoint/key rules and serializes registrations with
  an advisory transaction lock. Re-registering an existing device at the cap
  remains valid. Delivery queries also stop at ten subscriptions.
- Pinned `web-push` to 3.6.7 and aligned all five Supabase SDK imports with the
  frontend's exact 2.115.0 version.
- Added per-function frozen Deno lock configuration, lock/check/audit scripts,
  and a daily / push / pull-request dependency audit workflow. The locks are now
  generated: five functions have a `deno.lock`, and `stripe-prices` has none
  because it imports only a local module. All six typecheck against their frozen
  graph and report no known vulnerabilities. `edge:check` and `audit:edges` leave
  every lockfile byte-identical, so the workflow's `git diff --exit-code` step
  holds.
- Preserved the existing icon length validation after Zod changed string length
  counting, with localized validation messages in English and Greek.

## Verification

| Check                                       | Result                                                              |
| ------------------------------------------- | ------------------------------------------------------------------- |
| Root dependency audit (`bun audit --json`)  | Pass: `{}`                                                          |
| Lint                                        | Pass                                                                |
| Unit and invariant tests                    | Pass: 181 files, 1,678 tests                                        |
| Production build, including `tsc -b`        | Pass                                                                |
| Bundle budgets                              | Pass: all five budgets                                              |
| Backup safety tests                         | Pass: 10 tests                                                      |
| Knip                                        | Pass; existing CSS configuration hint only                          |
| Push delivery regression tests              | Pass: 24 cases                                                      |
| Backend dependency lock / typecheck / audit | Pass: six functions checked, no advisories                          |
| Playwright browser journeys                 | Pass: 98 tests, chromium and pwa-cache projects                     |
| Database boundary suite (linked project)    | Pass after the migration; fails without it                          |
| Database migration                          | Applied; constraints validated, trigger and grants verified         |
| Edge Function deployment                    | Five deployed; method and auth rejection verified live              |
| Frontend production release                 | Not deployed                                                        |

The new push tests were mutation-checked: removing the destination guard or
breaking the timeout caused failures. The FCM colon case failed before its
allowlist fix and passed afterward.

The database boundary suite runs with the real authenticated role inside a
transaction and rolls back all fixtures. Its earlier staged run passed finance,
receipt and push ownership isolation, destination/key validation, the device
cap and UPSERT at the cap. Removing the endpoint restriction, relaxing the cap,
or removing the UPSERT exception each made the corresponding check fail.
Run against the linked project before the migration, it failed at the first
unsafe endpoint, which proves the suite is live rather than vacuously passing.
The aborted transaction left no fixture rows behind. After the migration the
whole suite passes, including the FCM colon-token variant that was previously
outstanding.

`push_subscriptions` held no rows when the migration was applied, so the two
CHECK constraints validated against an empty table and could not fail on legacy
data. Afterwards both constraints report `convalidated`, the trigger is enabled,
and `private.enforce_push_subscription_limit` is SECURITY DEFINER with an empty
`search_path` and no grantee but the owner.

## Intentional version holds

`bunfig.toml` still enforces the seven-day minimum release age, exotic
transitive-dependency restriction and frozen lockfile. The existing exact
security-patch exception for `fast-uri` remains in place.

Newer releases of Sentry, Supabase JS/CLI, React/React DOM and their types,
Lucide, React Hook Form, typescript-eslint, Vite, Zod and Node 24 types remain
held by the release-age policy. `npm outdated` therefore still reports entries;
that output alone is not evidence of a vulnerability.

TypeScript stays on 6.0.3 with a `~6.0.3` range. TypeScript 7 has no compiler API,
and the official side-by-side alias setup resolved recursively under Bun 1.3.14
in this project, breaking ESLint and the AST-based mobile-input regression test.
The supported compiler restored both checks. Revisit this migration when the
package manager / tooling combination works reliably; keep `typecheck` as
`tsc -b`. See Microsoft's
[TypeScript 7 migration guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0).

## Hosted findings and limits

The read-only review found RLS enabled on all 24 public tables and all eight
storage tables, no anonymous grants on public tables, and a private receipts
bucket with a 10 MB limit and an image MIME allowlist. Authenticated isolation
checks supplement that configuration review; this was not an exhaustive
penetration test. Existing live CSP, HSTS, frame denial and content-type
protection headers were verified. The tracked-source scan found no common
secret patterns, and the production build strips source maps.

The advisor findings need interpretation:

- Eight authenticated security-definer RPC warnings cover intentional guarded
  household, recurring-expense, debt and rate-limit operations. They are not
  automatically unsafe grants.
- `public.tags(expenses)` deliberately has no fixed search path. Migration
  `20260909100100_restore_legacy_tags_embed_inlining.sql` restored SQL inlining
  for older clients. It is a security-invoker function with schema-qualified
  references. Reapplying a fixed search path would restore a measured query
  regression; retain this reviewed exception.
- Leaked-password protection is disabled. It requires Pro or above, the project
  is on the Free plan, and no paid upgrade has been authorized. The management
  API does not expose the plan on the project or organization record, so this
  rests on the plan recorded for the backup work rather than a fresh lookup.
  It is moot either way while the app authenticates with email OTP and stores no
  passwords, so treat it as an accepted limit rather than an open task. See
  [Supabase password security](https://supabase.com/docs/guides/auth/password-security).

## Deployment

`20260910211908_harden_push_delivery.sql` is applied to the linked project. Five
Edge Functions were redeployed, each keeping the `verify_jwt` setting it already
had:

| Function                  | Version | `verify_jwt` | Why                          |
| ------------------------- | ------- | ------------ | ---------------------------- |
| `send-push-notifications` | 19 → 20 | false        | Delivery guard, timeout, cap |
| `delete-account`          | 10 → 11 | true         | Supabase SDK 2.115.0         |
| `stripe-checkout`         | 10 → 11 | true         | Supabase SDK 2.115.0         |
| `stripe-portal`           | 5 → 6   | true         | Supabase SDK 2.115.0         |
| `stripe-webhook`          | 5 → 6   | false        | Supabase SDK 2.115.0         |

`stripe-prices` was deliberately not redeployed. Its code is unchanged, and its
new `deno.json` declares no imports, so deploying it would only flip its
`import_map` flag on for no benefit.

Deploys upload `deno.json` but not `deno.lock`, so the frozen locks guard local
and CI resolution rather than the hosted runtime. What constrains the hosted
runtime is the exact version pin in each import map.

Rejection behavior was checked live without sending a notification or charging
anyone: `send-push-notifications` and `stripe-webhook` answer GET with 405, and
answer an unsigned/unauthorized POST with 401 (`Unauthorized` and
`Invalid signature`). The three `verify_jwt` functions are rejected at the
gateway with 401 before the function body runs.

## Remaining batch

1. Publish the frontend and verify the deployed version. The backend is already
   live, which is the correct order for this batch: the database constraints and
   the Edge Function guard do not depend on the new frontend build.

Running the SQL boundary suite needs a direct `psql` session against the linked
project, using the database password in `~/.config/budgard/backup.env`. That file
is not shell-safe — the password contains shell metacharacters, which is why
`scripts/backup/io.mjs` parses it rather than sourcing it — and it must be paired
with `~/.config/budgard/backup-supabase-ca.crt` for `verify-full` to succeed
against the pooler.

An audit with zero known package advisories does not prove that the entire app
has no vulnerabilities. The backend audit and deployment remain open work.
