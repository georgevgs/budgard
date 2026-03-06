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

---

## Code Style

The guiding principle is **human-readable code**. Every rule below serves that goal — if following a rule makes code harder to read in a specific situation, the readable version wins.

### Variables and Values

- Always use `const`. Use `let` only when the variable is reassigned. Never use `var`.
- Prefer destructuring for objects and arrays when it makes the intent clearer:
  ```ts
  // good
  const { id, name, amount } = expense;

  // avoid when you only need one property — just use dot access
  const name = expense.name;
  ```
- Use object shorthand: `{ name }` not `{ name: name }`.
- Use spread for shallow copies: `{ ...expense, amount: 100 }`.
- Use template literals instead of string concatenation.
- Use `===` and `!==`. Never `==` or `!=`.

### Functions

- Use arrow functions for callbacks and inline handlers.
- Name every function — avoid anonymous `function()` declarations.
- Name event handlers with the `handle` prefix: `handleSubmit`, `handleDeleteClick`.
- Keep functions short and focused on one thing. If a function needs a comment to explain what it does, consider extracting it and naming it well instead.
- No unused parameters. Prefix intentionally unused params with `_` (e.g., `_event`).

### TypeScript

- Full type annotations on all function signatures (parameters and return types).
- No `any`. If a type is truly unknown, use `unknown` and narrow it.
- Prefer `type` over `interface` for consistency. Use `interface` only when you need declaration merging.
- Do not suppress TypeScript errors with `// @ts-ignore` or `// @ts-expect-error` unless there is no alternative — if used, add a comment explaining why.
- Strict mode is enabled. Keep the build clean: no unused locals, no unused parameters.

### React Components

- One component per file.
- PascalCase for component names. camelCase for instances.
- Components are arrow functions:
  ```tsx
  const ExpenseCard = ({ expense }: ExpenseCardProps) => { ... };
  export default ExpenseCard;
  ```
- Route-level components use default exports. All other components use named exports.
- Destructure props in the function signature. Define a `Props` type above the component:
  ```tsx
  type Props = {
    expense: Expense;
    onDelete: (id: string) => void;
  };

  export const ExpenseCard = ({ expense, onDelete }: Props) => { ... };
  ```
- Boolean props use the `is` or `has` prefix: `isOpen`, `isLoading`, `hasError`.
- Keep components under ~100 lines. Extract sub-components or helper render functions when they grow larger.

### Conditional Rendering

- **No ternary operators in JSX.** Use explicit `if`/`return` with helper render functions.
- **No `&&` for conditional rendering.** Same rule — use helper functions.

  ```tsx
  // good
  const renderBadge = () => {
    if (!expense.tag) {
      return null;
    }
    return <TagBadge tag={expense.tag} />;
  };

  // then in JSX
  {renderBadge()}
  ```

### Hooks

- Custom hooks are prefixed with `use` and live in `src/hooks/`.
- Extract reusable stateful logic into a custom hook rather than duplicating it across components.
- `useEffect` dependency arrays must be complete and honest. Never suppress exhaustive-deps warnings.
- Do not call hooks conditionally or inside loops.
- Avoid prop drilling beyond two levels — use context or lift state appropriately.

### Imports

- Group imports in this order, with a blank line between each group:
  1. React and third-party libraries
  2. Internal modules via `@/*` alias
  3. Types (can be merged with group 2 using `import type`)
- No default exports for utility functions or hooks — use named exports.
- Remove all unused imports.

### Naming

- Components: `PascalCase`
- Hooks, functions, variables: `camelCase`
- Constants that are truly fixed values: `UPPER_SNAKE_CASE`
- Files: match the primary export name (`ExpenseCard.tsx`, `useDataOperations.ts`)
- Avoid abbreviations. Write `expense` not `exp`, `category` not `cat`, `index` not `idx`.

### State and Data

- Never mutate state directly. Always produce a new value.
- Use `Array.map`, `Array.filter`, `Array.find`, and `Array.reduce` for data transforms. Prefer these over `for` loops when the intent is a transformation.
- Keep derived values as plain variables computed from state — not duplicated state:
  ```ts
  // good — derived on render
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  // avoid — duplicated state that can go out of sync
  const [totalAmount, setTotalAmount] = useState(0);
  ```

### Array Keys

- Keys must be stable, unique IDs from the data. Never use array indices as keys.

### No Magic Values

- No unexplained numbers or strings inline. Extract them as named constants with a clear name that explains their purpose:
  ```ts
  // good
  const MAX_RECEIPT_SIZE_BYTES = 1_000_000;

  // avoid
  if (file.size > 1000000) { ... }
  ```

### Error Handling

- Handle errors explicitly. Do not swallow them silently.
- Only validate at system boundaries (user input, Supabase responses). Trust internal data structures.
- Do not add defensive checks for impossible states.

### Formatting

- Prettier handles formatting. Do not fight it.
- Single quotes, trailing commas, 80 character line width, LF line endings.
- Helper functions are placed **below** the component they serve.
- Helper functions use **arrow function syntax** (`const foo = (...) => { ... }`). `function` declarations are only used for React components and named exports.
- **Add a blank line before `return`** in any function body that has statements above it. Early guard returns (`if (!x) return null;`) are exempt.
- No `console.log` left in committed code.
