# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Budgard is a PWA expense tracker built with React 19 + TypeScript + Vite, backed by Supabase (PostgreSQL, Auth, Storage, Edge Functions). Deployed on Netlify at budgard.com.

## Commands

```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # TypeScript compile + Vite production build
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier format src/
npm run format:check # Prettier check
npm run typecheck    # TypeScript check without emit
npm run preview      # Preview production build
```

Supabase CLI (via `npx supabase`):
```bash
npx supabase db push          # Push migrations to remote
npx supabase link --project-ref <ref>  # Link to project
```

No test framework is configured.

## Architecture

### Routing (src/App.tsx)

All route components are lazy-loaded. Routes are guarded by `PrivateRoute` (redirects unauthenticated to `/`) and `PublicRoute` (redirects authenticated to `/expenses`).

| Route | Component | Auth |
|-------|-----------|------|
| `/` | LandingPage | Public |
| `/expenses` | ExpensesList | Protected |
| `/recurring` | RecurringExpensesList | Protected |
| `/analytics` | AnalyticsView | Protected |

### State Management

Context API with two providers composed in `RootProvider`:
- **AuthProvider** (`contexts/AuthContext.tsx`) — Supabase session via `onAuthStateChange`, exposes `useAuth()`
- **DataProvider** (`contexts/DataContext.tsx`) — Fetches categories, expenses, recurring expenses, and budget in parallel on login. Exposes `useData()`

CRUD operations live in `hooks/useDataOperations.ts` — this hook implements optimistic updates with rollback on error. All Supabase calls go through `services/dataService.ts` and `services/receiptService.ts`.

### Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig and vite.config.ts). All imports use this alias.

### UI Layer

- **shadcn/ui** components live in `src/components/ui/` — these are generated, not hand-written
- Feature components are grouped by domain: `expenses/`, `categories/`, `recurring/`, `analytics/`, `budget/`, `auth/`, `layout/`, `landing/`
- Styling: TailwindCSS with class-based dark mode, custom animations in `tailwind.config.js`
- Icons: `lucide-react` (pinned to 0.469.0)

### Data Flow

1. User authenticates via email OTP (Supabase Auth)
2. `DataProvider` fetches all data in parallel from Supabase
3. Components read from context via `useData()`
4. Mutations go through `useDataOperations()` which does optimistic state updates → Supabase API call → rollback on failure
5. Receipts are compressed client-side (max 1MB, WebP) then uploaded to Supabase Storage bucket `receipts`

### Validation

All form schemas use Zod (`src/lib/validations.ts`). Forms use react-hook-form with `@hookform/resolvers/zod`.

### i18n

i18next with translations in `public/locales/{en,el}/translation.json`. Config in `src/lib/i18n.ts`. Browser language auto-detected.

### Database

Supabase PostgreSQL with tables: `expenses`, `categories`, `recurring_expenses`, `user_budgets`. Migrations in `supabase/migrations/`. A Supabase Edge Function handles recurring expense generation (`processRecurringExpenses`).

## Code Style Conventions

- **No ternary operators in JSX** — use explicit `if`/`return` with helper render functions
- **No `&&` for conditional rendering** — same pattern as above
- **Full TypeScript type annotations** — strict mode enabled, no unused locals/params
- **Helper functions placed below the component** they serve
- Prettier: single quotes, trailing commas, 80 char width, LF line endings
- Components are arrow functions with default exports for route-level components
