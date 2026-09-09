**Budgard performance and database audit — 8 September 2026**

The database is healthy at the current workload. No repository migrations are
pending on the linked project. The strongest frontend opportunity is reducing
uncached startup work and measuring the complete initial screen. Mobile
rendering and interaction speed remain unverified in this audit.

Audited local commit: `df44b0a`. The public service worker reports `ee872d7`;
the intervening commit changes configuration and removes a design source image,
with no application or database code changes. Local bundle measurements below
come from a fresh production build, not the deployed asset hashes.

| Check | Observed result | Interpretation |
| --- | --- | --- |
| HTML entry JS/CSS | 173.8 KiB gzip, 17 files | Passes the 190 KiB budget |
| Landing + English static dependency graph | 264.7 KiB gzip, 44 files | Additional route and translation downloads |
| Today + authenticated shell + English static dependency graph | 398.4 KiB gzip, 123 files | More than twice the HTML-only figure |
| Today with Greek instead | 407.7 KiB gzip | Slightly larger translation payload |
| Precached asset JS/CSS | 522.9 / 545 KiB gzip | Passes, with about 4% headroom |
| Complete service-worker precache | 197 entries, 1,884.7 KiB raw | Includes images and HTML outside the JS/CSS budget |
| Live HTML time to first byte | 834 ms and 341 ms | Two unthrottled command-line samples; not LCP |
| Live hashed JavaScript caching | One-year immutable cache policy; Netlify cache hit on repeat | Correct asset cache policy |
| Database size | 22.7 MiB | Small current database |
| Expenses table | Approximately 1,465 live rows | Current measurements do not establish large-scale capacity |
| Database buffer-cache hit rate | 99.997% cumulative | No sign of a working-set memory problem |
| Current connections / blocked / queries over 10 seconds | 6 / 0 / 0 | No contention at the observation time |
| Recorded deadlocks | 0 | No recorded deadlock problem |
| Local / remote migrations | 86 / 86, all versions match | No pending or remote-only versions |
| Live function lint, public and private schemas | No schema errors | No function lint errors found |

The dependency-graph measurements follow static imports from the HTML assets
and the named screen, shell, and locale chunks, deduplicating files and summing
their individual gzip sizes. They exclude fonts, API responses, telemetry,
service-worker installation, and further dynamic imports. They describe build
weight, not a browser waterfall or elapsed startup time.

**Findings, in priority order**

1. **Medium: the startup budget understates the initial screen's weight.**
   [bundleBudget.mjs](../scripts/bundleBudget.mjs:67) measures only JS/CSS
   references in `index.html`. The authenticated shell, initial route and
   selected language arrive later. The English Today dependency graph is
   398.4 KiB gzip, versus the reported 173.8 KiB critical path. Add separate
   Landing and authenticated-startup budgets so changes in those chunks remain
   visible. The precache budget also excludes images: the install screenshot
   alone is 128,492 bytes, is referenced by the web manifest, and is currently
   precached on every fresh install. Consider fetching that screenshot when
   needed for installation; it is not used by an application component.

2. **Medium: an uncached dashboard waits for 12 primary requests.**
   [dataFetch.ts](../src/common/hooks/data/dataFetch.ts:79) applies the first
   data state only after a single `Promise.all` completes. A slow notification,
   template or other auxiliary request therefore holds back dashboard data;
   a rejected request rejects the entire initial batch. The requests run in
   parallel, so their latencies must not be added together. Separate essential
   dashboard data from notification settings and form-only data, with explicit
   loading states for deferred domains. Also measure the language-loading
   dependency: [i18n.ts](../src/config/i18n.ts:34) loads translations before
   [main.tsx](../src/main.tsx:107) mounts React. No millisecond savings are
   claimed without a browser trace.

3. **Medium for older clients: the legacy tag relationship has measurable
   overhead.** A representative authenticated read of 725 recent expenses,
   including category/tag/extra-tag embeds and JSON aggregation, took 123.0 ms
   using `public.tags(expenses)`. The equivalent direct tag join took 36.1 ms.
   These are individual read-only `EXPLAIN ANALYZE` samples with different cache
   and planning conditions, not a controlled before/after benchmark. The
   legacy plan invoked the tag function 725 times; the direct plan memoized
   the tag lookup and evaluated it six times. Current code already names the
   direct foreign-key relationship in
   [dataAccess.ts](../src/common/api/dataAccess.ts:19).
   Historical statistics also separate the paths: 123 direct-tag calls have
   a weighted mean of 14.8 ms; 1,127 computed-tag calls average 27.2 ms, with
   one 163-call shape averaging 83.1 ms.

   The September 4 [hardening migration](../supabase/migrations/20260904170059_harden_advisor_functions.sql:7)
   added a function-level `search_path`, while the original compatibility
   migration explicitly depended on having no `SET` clause for inlining.
   The live plan confirms a function scan. This is consistent with
   [PostgreSQL's documented inlining restrictions](https://wiki.postgresql.org/wiki/Inlining_of_SQL_functions).
   Any future optimization must preserve tag RLS, function safety, and old PWA
   compatibility. Treat this as a measured legacy-path cost, not evidence that
   the current direct join needs another index.

4. **Low: one foreign key lacks a supporting index.** The live advisor names
   `financial_connections_created_by_fkey`. The
   [connection migration](../supabase/migrations/20260831171142_add_financial_connection_boundary.sql:31)
   creates `created_by REFERENCES auth.users(id) ON DELETE SET NULL` but only
   indexes `(user_id, status)`. A future maintenance migration can add an index
   on `created_by`, optionally limited to non-null values. This helps
   referential actions as the table grows. The table currently has no live rows,
   so the missing index does not explain present app latency.

5. **Low at today's size: client work grows with history.**
   [useActivityFeed.ts](../src/pages/activity/hooks/useActivityFeed.ts:33)
   clones and sorts the full expense/income collection in the same memo that
   depends on the search text. Each keystroke repeats that work. Split stable
   normalization/sorting from filtering before larger histories become common.
   The feed initially renders 20 rows and extends on scroll, which limits
   initial DOM work, but it does not virtualize rows already revealed.
   Secondary refreshes also fetch the complete account-balance history, and
   snapshots retain that history in synchronous localStorage. Benchmark these
   paths with larger fixtures before changing them; no current interaction
   delay was measured.

**Database and migration evidence**

`supabase migration list --linked` matched every local and remote version.
The newest is `20260904170059_harden_advisor_functions`. The three indexes from
`20260904165547_optimize_keyset_pagination` exist with the expected definitions:

| Index | Live definition | Recorded scans |
| --- | --- | --- |
| `expenses_user_type_history_cursor_idx` | `(user_id, type, date DESC, created_at DESC, id DESC)` | 185 at initial sampling |
| `expenses_debt_history_cursor_idx` | `(debt_id, date DESC, created_at DESC, id DESC) WHERE debt_id IS NOT NULL` | 0 |
| `account_balances_user_history_cursor_idx` | `(user_id, recorded_at, id)` | 0 |

The fresh expense plans use `expenses_user_type_history_cursor_idx`. Unused
indexes on empty or tiny domains are not sufficient evidence for removal.
All public tables have RLS enabled. The expense access-policy subplan still
runs once per row (725 loops), since its helper receives the row's `user_id`;
the surrounding `SELECT` does not make a row-dependent result a single
statement-wide check. It accounts for roughly 16 ms in the direct-join sample.
Revisit this at larger volumes while retaining immediate household revocation
and subscription checks. Supabase explains the limits of caching function
results in its [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

The last seven days show seven successful recurring-expense cron runs and
168 successful push-dispatch cron runs, with no failures recorded by cron.
For push dispatch, this establishes successful scheduling/enqueueing, not
delivery to a device.

Advisors returned no errors. Performance findings were one unindexed foreign
key, 23 unused indexes, and no primary key on the tiny `checkout_attempts`
table. Security findings included eight authenticated security-definer RPC
warnings, disabled leaked-password protection, and RLS without policies on
`checkout_attempts`. The RPCs correspond to intentional household, debt,
recurring and rate-limit operations; the checkout table is intentionally
accessed through its guarded RPC. These findings are not automatically missing
migrations. Password protection is a separate hosted Auth setting; the app
currently uses email OTP. This was not an exhaustive authorization audit.

Postgres reports a large lifetime temporary-byte counter (about 821 GiB).
Retained statements with the most temporary writes were administrative
statistics/schema queries. The audit does not attribute the whole cumulative
counter to those retained statements, or treat it as a current disk-pressure
measurement. Query statistics have a reset timestamp of 31 January 2026 and
mix older releases and workloads; historical means are not current p95 values.

Migration verification establishes matching version history plus the checked
live objects and function lint. It does not establish a complete schema diff
or detect every possible manual edit to an applied migration or live object.
No production schema, data, indexes, or migration history were changed.

**Validation and remaining measurements**

`npm run lint`, `npm run test` (179 files, 1,628 tests), `npm run build`
(including `tsc -b`), and `npm run budget` passed. `npm run knip` initially
failed on sandbox DNS; its underlying `npx --yes knip` command then passed
with network access, with one configuration hint about CSS imports.
Supabase's linked database lint reported no schema errors in either
`public` or `private`.

Chrome DevTools was unavailable, the Browser runtime reported no connected
browsers, and Google's public PageSpeed API returned HTTP 429. Consequently,
this audit has no Lighthouse score, measured LCP/INP/CLS, authenticated browser
waterfall, slow-device profile, or concurrency load test. Existing Sentry
browser tracing is configured at a 10% sample rate, but its live results were
not accessible here. The next performance measurement should cover cold and
cached Today loads plus Activity search/scroll on a representative phone.
Assess the 75th percentile against LCP ≤2.5 seconds, INP ≤200 ms and CLS ≤0.1,
following [Google's Core Web Vitals guidance](https://web.dev/articles/vitals).
