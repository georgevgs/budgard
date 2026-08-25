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

Defined in `src/App.tsx`.

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
| `/recurring` | RecurringExpensesList | Protected |
| `/goals` | GoalsList | Protected |
| `/networth` | NetWorthView | Protected |
| `/debts` | DebtsView | Protected (Pro) |
| `/settings` | SettingsView | Protected |

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
          └── DataProvider
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

Holds global app state and fetches it after login. The consumer hooks live in
`contexts/DataContext.tsx`.

#### Fetch Strategy

Two stages, so first paint does not wait on full history:

1. Categories, budget, and the **last 12 months** of transactions
2. The rest of the history streams in from a background `Promise.all`

`isHistoryLoaded` tells a screen which stage it is looking at.

#### Consumer hooks

Prefer the narrow ones — they re-render only when their own slice changes:

- `useDataConfig()` — slow-changing scalars (`isInitialized`, `monthlyBudget`,
  `defaultCurrency`, `defaultSavingsPct`)
- `useDataActions()` — stable setters and refresh callbacks
- `useExpensesData()`, `useIncomesData()`, `useCategoriesData()`,
  `useTagsData()`, and one per remaining domain
- `useData()` — the full snapshot. A back-compat shim: it re-renders on **any**
  data mutation, so do not reach for it in new code.

---

## Data Mutations

All mutations go through the domain operation hooks in:

```
hooks/dataOps/
```

One hook per domain — `useExpenseOps`, `useIncomeOps`, `useCategoryOps`,
`useTagOps`, `useBudgetOps`, `useGoalOps`, `useDebtOps`, `useAccountOps`,
`useRecurringExpenseOps`, `useRecurringIncomeOps`, `useTemplateOps`,
`useNoSpendOps`, `useSettingsOps`. There is no composed `useDataOperations`;
call the domain hook you need directly.

### Responsibilities

- Perform CRUD operations
- Apply **optimistic updates**
- Roll back state on failure

### Flow

1. Update UI optimistically
2. Call service layer
3. If error → rollback previous state

When offline (or the server is down), writes are queued in IndexedDB and
reconciled on reconnect — see `lib/offlineQueue.ts`.

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

- `services/dataService.ts` — every table read and write
- `services/receiptService.ts` — receipt upload/removal in Supabase Storage
- `services/ocrService.ts` — Tesseract receipt scanning (Pro)
- `services/subscriptionService.ts` — Stripe checkout/portal via edge functions
- `services/proPlansService.ts` — live Pro prices
- `services/exchangeRateService.ts` — Frankfurter FX rates

### Rules

- No direct Supabase calls outside services
- Services return typed data
- Errors must be propagated (not swallowed)

---

## Data Flow

1. User logs in (Supabase Auth)
2. `AuthProvider` updates session
3. `DataProvider` fetches all data in parallel
4. Components consume state via `useData()`
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

## Database

Supabase PostgreSQL. Every table is RLS-protected and owner-scoped.

- Transactions: `expenses` (income and expenses share the table, discriminated
  by `type`), `expense_tags`, `tags`, `categories`, `expense_templates`
- Planning: `user_budgets`, `category_budgets`, `recurring_expenses`, `goals`,
  `no_spend_days`
- Net worth: `accounts`, `account_balances`, `debts`
- Platform: `subscriptions`, `checkout_attempts`, `push_subscriptions`

Migrations are in `supabase/migrations/` and are append-only history — never
edit an applied one. Run `supabase migration list --linked` to see what is
applied.

---

## Edge Functions

In `supabase/functions/`. Netlify only ships the frontend, so these must be
deployed by hand (`supabase functions deploy <name>`).

- `stripe-checkout`, `stripe-portal`, `stripe-prices`, `stripe-webhook` — Pro
  billing
- `send-push-notifications` — hourly cron; bill reminders, budget crossings
- `delete-account` — OTP-reauthenticated account deletion

Recurring expense generation is **not** an edge function. It runs in Postgres:
`pg_cron` calls `process_all_recurring_expenses()`, which is service-role only.

---

## File Uploads (Receipts)

Handled via `receiptService.ts`

### Flow

1. Compress client-side (`browser-image-compression`)
2. Upload to the Supabase Storage bucket below, under the owner's user id
3. Read back through short-lived signed URLs (`useReceiptUrl`)

Pro users can also run the receipt through `services/ocrService.ts` (Tesseract,
self-hosted under `/ocr/`) to prefill the amount, date and merchant.

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
