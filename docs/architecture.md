# Architecture

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

| Route | Component | Access |
|------|----------|--------|
| `/` | LandingPage | Public |
| `/expenses` | ExpensesList | Protected |
| `/recurring` | RecurringExpensesList | Protected |
| `/analytics` | AnalyticsView | Protected |

---

## State Management

Uses **React Context API** with two main providers.

### Root Composition

```
RootProvider
  ├── AuthProvider
  └── DataProvider
```

---

### AuthProvider (`contexts/AuthContext.tsx`)

Responsible for:

- Managing Supabase authentication session
- Listening to `onAuthStateChange`
- Exposing `useAuth()`

#### Provides:

- `user`
- `session`
- auth methods (login/logout)

---

### DataProvider (`contexts/DataContext.tsx`)

Responsible for:

- Fetching all app data after login
- Holding global app state

#### Fetch Strategy

- Runs **parallel requests** on login:
    - categories
    - expenses
    - recurring expenses
    - budget

#### Exposes:

- `useData()` hook
- Centralized state used across the app

---

## Data Mutations

All mutations go through:

```
hooks/useDataOperations.ts
```

### Responsibilities

- Perform CRUD operations
- Apply **optimistic updates**
- Roll back state on failure

### Flow

1. Update UI optimistically
2. Call service layer
3. If error → rollback previous state

---

## Service Layer

All external communication is centralized.

### Files

- `services/dataService.ts`
- `services/receiptService.ts`

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
6. `useDataOperations()`:
    - optimistic update
    - API call via service
    - rollback on failure

---

## File & Folder Structure

```
src/
  ├── components/
  │     ├── ui/           # shadcn (generated)
  │     ├── expenses/
  │     ├── categories/
  │     ├── recurring/
  │     ├── analytics/
  │     ├── budget/
  │     ├── auth/
  │     ├── layout/
  │     └── landing/
  │
  ├── contexts/
  ├── hooks/
  ├── services/
  ├── lib/
  └── App.tsx
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

- TailwindCSS
- Dark mode via class strategy
- Custom animations in `tailwind.config.js`

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
public/locales/{en,el}/translation.json
```

### Behavior

- Auto-detect browser language

---

## Database

Supabase PostgreSQL tables:

- `expenses`
- `categories`
- `recurring_expenses`
- `user_budgets`

---

## Edge Functions

### `processRecurringExpenses`

- Runs recurring expense generation logic
- Triggered via Supabase

---

## File Uploads (Receipts)

Handled via `receiptService.ts`

### Flow

1. Compress client-side:
    - Max size: 1MB
    - Format: WebP
2. Upload to Supabase Storage

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