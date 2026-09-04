# Architecture

> **`CLAUDE.md` / `AGENTS.md` in the repo root is the authority.** They are the
> same generated rulebook and every agent loads one of them. This document is
> the expanded form of one of its sections — if the two ever disagree, the
> rulebook wins and this file is the one to fix.

This document defines how the application is structured.  
Follow these patterns when adding or modifying features.

---

## Overview

Budgard is a **PWA expense tracker** built with:

- React 19 + TypeScript + Vite
- Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- TailwindCSS + shadcn/ui

Deployed on Netlify.

---

## High-Level Architecture

The app follows a **client-driven architecture** with:

- Context-based global state
- Service layer for all external calls
- Hooks for business logic
- Feature-based component structure

---

## Routing

The signed-out router is defined in `src/App.tsx`; authenticated route objects,
guards, lazy-module declarations and the keep-alive tab layout live under
`src/components/routing/`.

- All routes are **lazy-loaded**
- Route protection handled via wrappers:

### Route Guards

- `PrivateRoute`
    - Redirects unauthenticated users → `/`
- `PublicRoute`
    - Redirects authenticated users → `/expenses`

### Routes

The four main tabs live in `src/lib/routes.ts` (`MAIN_TAB_PATHS`) because more
than one place has to know exactly which routes are tabs. `MainTabsLayout`
mounts all four and hides the inactive ones, so switching tabs keeps state.

| Route | Component | Access |
|------|----------|--------|
| `/` | LandingPage | Public |
| `/privacy`, `/terms`, `/contact` | legal pages | Public |
| `/today` | TodayView | Protected (tab) |
| `/activity` | ActivityView | Protected (tab) |
| `/plan` | PlanView | Protected (tab) |
| `/trends` | AnalyticsView | Protected (tab) |
| `/t/:id` | TransactionDetailView | Protected |
| `/review` | ReviewQueueView | Protected |
| `/recurring` | RecurringExpensesList | Protected |
| `/goals` | GoalsList | Protected |
| `/networth` | NetWorthView | Protected |
| `/debts` | DebtsView | Protected (Pro) |
| `/settings` | SettingsView | Protected |
| `/join?token=…` | JoinHouseholdView | Public link, authenticated acceptance |

`/expenses`, `/income` and `/analytics` are the pre-redesign paths. They stay
as permanent `LegacyRedirect`s to `/today`, `/activity` and `/trends` — old
push notifications and home-screen shortcuts still point at them, so they have
to keep resolving indefinitely.

---

## State Management

Uses the **React Context API**. Providers live in separate files from their
contexts so fast refresh keeps working: `*Provider.tsx` holds the component,
`*Context.tsx` holds `createContext` plus the consumer hooks.

### Root Composition

```
RootProvider
  └── AuthProvider                 # always mounted

AuthenticatedProviders             # behind the auth boundary only
  └── SubscriptionProvider
      └── UpgradeDialogProvider
          └── FinancialSpaceProvider
              └── DataProvider     # remounts when active owner changes
```

Data and billing have no consumers on the landing or legal pages, so their
providers sit behind the authenticated boundary — a signed-out visitor never
downloads or evaluates the data layer.

---

### AuthProvider (`contexts/AuthProvider.tsx`)

Responsible for:

- Managing the Supabase authentication session
- Listening to `onAuthStateChange`
- Backing `useAuth()`, exported from `contexts/AuthContext.tsx`

---

### DataProvider (`contexts/DataProvider.tsx`)

Holds global app state and fetches it after login. Every read is explicitly
scoped to `FinancialSpaceProvider.activeOwnerId`; the owner/member space key
also scopes the local cache and offline queue. The consumer hooks live in
`contexts/DataContext.tsx`.

### FinancialSpaceProvider (`contexts/FinancialSpaceProvider.tsx`)

Exposes the signed-in user's own space plus any accepted household space. The
switcher changes the active data owner, not the authenticated identity:
notification preferences, security and billing remain personal while finance
tables read and write the selected owner's rows. PostgreSQL RLS independently
checks the same relationship; the owner id supplied by the client is never an
authorization decision.

#### Fetch Strategy

The provider boots categories, planning data, and the **last 12 months** of
transactions. Older transaction history is explicit and on demand: Activity
requests it for all-time search or an older month, while Pro Trends and annual
export request it when those views mount. Concurrent requests share one
keyset-paginated fetch and `isHistoryLoaded` tells consumers whether the tail
is present. Routine foreground refreshes stay bounded unless the tail was
already loaded.

#### Consumer hooks

Prefer the narrow ones — they re-render only when their own slice changes:

- `useDataConfig()` — slow-changing scalars (`isInitialized`, `monthlyBudget`,
  `defaultCurrency`, `defaultSavingsPct`)
- `useDataActions()` — stable setters and refresh callbacks
- `useExpensesData()`, `useIncomesData()`, `useCategoriesData()`,
  `useTagsData()`, and one per remaining domain

There is no combined `useData()` snapshot. Consumers subscribe to the narrow
slice they need so an unrelated data mutation does not re-render them.

---

## Data Mutations

All mutations go through the domain operation hooks in:

```
hooks/dataOps/
```

One hook per domain — `useExpenseOps`, `useIncomeOps`, `useCategoryOps`,
`useTagOps`, `useBudgetOps`, `useGoalOps`, `useDebtOps`, `useAccountOps`,
`useRecurringExpenseOps`, `useRecurringIncomeOps`, `useTemplateOps`,
`useNoSpendOps`, `useSettingsOps`, `useHouseholdOps`,
`useTransactionReviewOps`, `useSurplusInvestmentOps`, `useFeedbackOps`. Call the domain hook you
need directly; there is no composed `useDataOperations`.

### Responsibilities

- Perform CRUD operations
- Apply **optimistic updates**
- Roll back state on failure

### Flow

1. Update UI optimistically
2. Call service layer
3. If error → rollback previous state

### The shared shell: `useMutationRunner`

Every one of those writes is the same sequence, so it lives in one place —
`hooks/dataOps/useMutationRunner.ts` — and the domain hooks describe only what
differs. A mutation is declared, not spelled out:

```ts
runMutation({
  operation: 'createGoal',        // Sentry tag
  skip,                           // the isInitialized guard
  errorMessage: t('...'),         // shown with a "Try again" action
  successMessage: t('...'),       // omit for writes that shouldn't announce
  optimistic: () => prependOptimistic(setGoals, optimisticGoal), // returns its undo
  perform: () => dataService.createGoal(goalData),
  commit: (saved) => setGoals((prev) => replaceById(prev, temp.id, saved)),
});
```

The runner handles the rest: haptics, the Sentry tag, the rollback, the
retryable error toast, and rethrowing. The retry deliberately re-runs the
optimistic pass — by the time the user taps it, the rollback has already
happened.

Options that exist because real call sites need them:

- `successHaptic: 'none'` — settings scalars don't buzz; the control moving is
  the confirmation
- `retryable: false` — deleting an account or splitting an expense must not
  offer a one-tap re-run
- `offlineFallback` — return `true` to say the failure was handled (queued),
  so the runner resolves quietly instead of rolling back
- `commit` may be async when reconciling needs a follow-up read

The three optimistic shapes — `prependOptimistic`, `patchOptimistic`,
`removeOptimistic` — plus `setScalarOptimistic` live in `dataOps/helpers.ts`.
They read the previous list from **inside** the updater, which is what keeps a
rollback correct when two writes overlap.

`useFeedbackOps` deliberately sits outside the runner: it reports with a plain
destructive toast, offers no retry, and carries an extra Sentry tag.

### Offline writes

When offline (or the server is down), writes are queued in IndexedDB and
reconciled on reconnect — see `lib/offlineQueue.ts`.

**Only expenses and incomes are queued.** `MutationType` in `offlineQueue.ts`
and the cases in `useOfflineSync` must stay in lock-step — a type queued with
no matching sync case is silently dropped — and `mutationEntity()` is written
for those two tables. Extending offline to another entity means adding its sync
case and its temp-id reconciliation, not just widening a union.

### PWA Cache Boundary

The service worker caches the app shell and immutable, content-versioned
assets. Supabase requests are always network-only: REST, Auth, Storage and Edge
Function responses can contain private, mutable data and Cache Storage is not
the source of truth for offline reads.

Offline data comes from the app-owned snapshot in `lib/dataCache.ts`, which is
scoped to the authenticated user. Never add a service-worker fallback for an
authorized API response; extend the user-scoped data cache instead.

---

## Service Layer

All external communication is centralized.

### Files

- `services/dataService.ts` — core finance-table reads and writes
- `services/receiptService.ts` — receipt upload/removal in Supabase Storage
- `services/ocrService.ts` — Tesseract receipt scanning (Pro)
- `services/uiPreferencesService.ts` — owner-scoped Today layout sync
- `services/feedbackService.ts` — append-only feedback/problem reports
- `services/subscriptionService.ts` — Stripe checkout/portal via edge functions
- `services/pushSubscriptionService.ts` — push subscription persistence
- `services/proPlansService.ts` — live Pro prices
- `services/exchangeRateService.ts` — Frankfurter FX rates
- `services/householdService.ts` — secure invite/accept/revoke RPCs
- `services/transactionRuleService.ts` — merchant rules and review state
- `services/recurringSuggestionService.ts` — dismissals and import reconciliation
- `services/goalFundingService.ts` — atomic surplus-to-investment transfers
- `services/financialConnectionService.ts` — non-secret connection status only
- `services/supabaseCrud.ts` — `rows` / `row` / `maybeRow` / `done`

### Rules

- No direct Supabase calls outside services
- Services return typed data
- Errors must be propagated (not swallowed)

`supabaseCrud` owns only the tail every query shares: unwrap `{ data, error }`,
throw the error, cast the rows. It is deliberately **not** a query builder —
the Supabase chain stays spelled out at each call site, because the `select`
strings there name their foreign keys explicitly. A helper that assembled one
is exactly the bug that made the bare `tags` embed ambiguous and broke
months-stale PWA bundles with PGRST201.

## Transaction automation

Statement imports and future provider rows enter the same pipeline:

1. Normalize the merchant and apply the highest-priority matching rule.
2. Mark the row `pending` and show it in `/review`.
3. Reconcile only exact recurring matches automatically; looser cadence
   patterns remain suggestions that require confirmation.
4. Use provider external transaction ids as the idempotency boundary for
   connected rows.

The provider-neutral connection tables contain status and account mappings,
never access tokens or raw provider payloads. A server-side provider adapter
must normalize data and call the service-role-only
`ingest_connected_transactions` RPC. Until an adapter and regulated provider
are configured, the app truthfully offers statement import rather than a fake
"connect bank" action.

## Goals and investable surplus

An `account` goal reads progress from the current balance of its linked
investment account. Today's surplus action calls `invest_goal_surplus`, which
atomically adds a contribution snapshot and writes an excluded activity row.
Unspent daily allowance is therefore an explicit investment decision, not a
category rollover or an imaginary balance.

---

## Data Flow

1. User logs in (Supabase Auth)
2. `AuthProvider` updates session
3. `DataProvider` fetches the bounded boot dataset in parallel
4. Components consume state through the narrow slice contexts
5. User triggers mutation
6. The domain hook in `hooks/dataOps/`:
    - optimistic update
    - API call via service
    - rollback on failure

---

## File & Folder Structure

```
src/
  ├── boot/              # pre-React guards + the inline head script
  ├── components/
  │     ├── ui/          # shadcn primitives (do not modify)
  │     ├── bento/       # BentoGrid / BentoTile / TileLabel — the grid language
  │     ├── charts/      # hand-rolled SVG charts (no charting library)
  │     ├── common/
  │     ├── today/       # + today/tiles/    the Today bento modules
  │     ├── activity/  plan/
  │     ├── analytics/   # + analytics/tiles/  the Trends bento modules
  │     ├── expenses/  income/  categories/  tags/  budget/
  │     ├── recurring/  goals/  debts/  networth/
  │     ├── auth/  security/  onboarding/  pro/  settings/
  │     ├── layout/  landing/  recap/  transaction/
  │     ├── routing/          # route tree, guards, shell and lazy modules
  │
  ├── contexts/          # *Provider.tsx + *Context.tsx pairs
  ├── design/            # tokens.ts, palette.ts, generate.ts
  ├── hooks/             # feature subfolders + dataOps/
  ├── lib/               # pure helpers, validations, i18n
  ├── locales/           # en/ and el/ translation.json
  ├── pages/             # LandingPage + legal/
  ├── services/
  ├── test/invariants/   # repo-wide guard tests
  ├── types/
  ├── App.tsx            # public routes
  └── AuthenticatedApp.tsx
```

---

## Path Aliases

Configured in:

- `tsconfig.json`
- `vite.config.ts`

```
@/* → src/*
```

Use aliases for all internal imports.

---

## UI Layer

### Component Types

- **UI primitives**
    - Located in `components/ui/`
    - Generated via shadcn
    - Do not modify unless necessary

- **Feature components**
    - Grouped by domain (expenses, categories, etc.)

---

### Styling

- TailwindCSS 4, configured **CSS-first** — there is no `tailwind.config.js`.
  The `@theme` block and custom variants live at the top of `src/index.css`.
- Themes: `dark` via the `.dark` class (`@custom-variant dark`), plus a
  `[data-theme='barbie']` accent theme.
- **Every colour comes from `src/design/tokens.ts`.** The generated CSS, the
  pre-paint script in `index.html`, the manifest colours and the CSP hash in
  `netlify.toml` are all built from it. Never hand-edit the generated outputs.

---

### Icons

- `lucide-react` (pinned version)

---

## Forms & Validation

- Schemas: `src/lib/validations.ts` (Zod)
- Forms: `react-hook-form`
- Validation: `@hookform/resolvers/zod`

### Rules

- All forms must use Zod schemas
- Validation happens at input boundaries only

---

## i18n

- Library: i18next
- Config: `src/lib/i18n.ts`

### Files

```
src/locales/{en,el}/translation.json
```

Bundled with the app, not fetched at runtime. `src/test/invariants/i18nParity.test.ts`
fails the build if a key or an interpolation exists in one locale and not the
other.

### Behavior

- Auto-detect browser language

---

## Pro Gating

Everything the free plan limits is declared in one place: `lib/proGates.ts`.
Before it existed, the only way to answer "what exactly is gated?" was to grep
for `openUpgrade()`.

Two kinds of gate:

- a **cap** — allowed up to `limit`, then a toast naming it (`categories`,
  `recurringExpenses`, `accounts`, `tagsPerExpense`)
- **pro-only** — not on the free plan at all (`receiptScan`, `csvExport`,
  `categoryBudgets`)

Ask through `useProGate`, never by reading `isPro` and hand-rolling the upsell:

```ts
const { allow } = useProGate();

if (!allow('accounts', accounts.length)) return;   // toasts + opens upgrade
```

`allow` returns true when the action may proceed. When it may not, it explains
the limit (where the gate has a message) and opens the upgrade flow. Pass
`{ onBlock }` to close a popover that would otherwise sit on top of the dialog.

Every gate names what was blocked before the dialog appears. The upgrade
dialog itself is generic ("Upgrade to Pro") and never mentions the feature the
user just tried, so a gate that stayed silent left them to infer it — the
`useProGate` test suite fails if any gate is added without a `messageKey`.

`ProRoute` guards whole routes; read-only branching gets `isPro` from
`useSubscription` (showing an upsell card rather than blocking an action).

---

## Database

Supabase PostgreSQL. Every table is RLS-protected and owner-scoped.

- Transactions: `expenses` (income and expenses share the table, discriminated
  by `type`), `expense_tags`, `tags`, `categories`, `expense_templates`
- Planning: `user_budgets`, `category_budgets`, `recurring_expenses`, `goals`,
  `no_spend_days`
- Net worth: `accounts`, `account_balances`, `debts`
- Platform: `subscriptions`, `checkout_attempts`, `push_subscriptions`,
  `user_ui_preferences`, `feedback_reports`

Migrations are in `supabase/migrations/` and are append-only history — never
edit an applied one. Run `supabase migration list --linked` to see what is
applied.

Security-definer functions use an empty `search_path` with schema-qualified
objects. Compatibility parameters in legacy RPCs must be validated rather
than silently ignored.

---

## Edge Functions

In `supabase/functions/`. Netlify only ships the frontend, so these must be
deployed by hand (`supabase functions deploy <name>`).

- `stripe-checkout`, `stripe-portal`, `stripe-prices`, `stripe-webhook` — Pro
  billing
- `send-push-notifications` — hourly cron; bill reminders, budget crossings
- `delete-account` — OTP-reauthenticated account deletion; clears receipt
  storage and immediately cancels a non-terminal Stripe subscription before
  removing the auth user

Functions that use Supabase JS import the local `supabase` specifier. Each
function's `deno.json` maps it to the same exact npm version so deployments do
not float to a new SDK release independently.

The hosted project uses email OTP rather than app passwords. Supabase's leaked
password check remains a useful defense-in-depth setting if password auth is
ever introduced, but it is available only on Supabase Pro and above.

The data provider boots with a bounded 12-month transaction window. Activity
requests the older tail for all-time search or an older selected month; Pro
Trends and annual export request it when those screens mount. Concurrent
requests share one fetch, and routine foreground refreshes remain bounded.

Recurring expense generation is **not** an edge function. It runs in Postgres:
`pg_cron` calls `process_all_recurring_expenses()`, which is service-role only.

---

## File Uploads (Receipts)

Handled via `receiptService.ts`

### Flow

1. Compress client-side (`browser-image-compression`)
2. Upload to the Supabase Storage bucket below, under the owner's user id
3. Read back through short-lived signed URLs (`useReceiptUrl`)

Pro users can also capture and scan a receipt from Quick Add or the full form
through `services/ocrService.ts` (Tesseract, self-hosted under `/ocr/`) to
prefill the amount, date and merchant.

### Storage Bucket

```
receipts
```

---

## Key Architectural Rules

- No direct API calls inside components
- All business logic goes into hooks
- All external communication goes through services
- State must remain immutable
- Avoid prop drilling beyond 2 levels → use context
- Keep components focused on rendering

---

## Mental Model

- **Components** → render UI
- **Hooks** → contain logic
- **Services** → talk to backend
- **Context** → share state
