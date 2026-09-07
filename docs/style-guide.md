# Style Guide

> **Source: <https://react-typescript-style-guide.com/> (MIT).** This is a
> condensed, in-repo copy so an agent or a reviewer without a browser still has
> the rules. The site is the authority; if the two disagree, the site wins and
> this file is the one to fix.
>
> Rules marked **[enforced]** are checked by `eslint.config.js` or by a test in
> `src/test/invariants/`. The rest are review-level conventions.

---

## Philosophy

- **Minimal mental overhead.** Code should be scannable without comments or
  context-switching.
- **Predictability.** Every file follows the same structure.
- **Clarity over flexibility.** Uniformity beats supporting every style.
- **Encapsulation.** A feature is self-contained; its parts live together.
- **No unnecessary abstraction.** Do not over-engineer.
- **Early returns.** Reduce nesting.
- **Separation of concerns.** Logic, UI and state stay apart.

## Folder structure

- **Feature-based.** Each feature owns a folder under `src/pages/`.
- **Hooks placement.** A feature's hooks live in `<feature>/hooks/`. A shared
  module under `common/components/` does the same with its own private hooks —
  `charts/hooks/useChartSize.ts`. `common/hooks/` is for hooks that genuinely
  cross features; a hook only its own module calls does not belong there.
- **Common folder.** Shared components, hooks and utilities go in `src/common/`.
- **Config folder.** External integrations only (Supabase, Sentry, i18n, the
  service worker).
- **Constants folder.** App-wide constants and utilities used by more than one
  feature.
- **Queries at the feature root.** A feature's Supabase queries live in
  `<feature>/<feature>Api.ts`, so an audit of what it reads and writes is one
  file. (The guide says this about GraphQL; Supabase is our equivalent.)
- **Barrel files.** The guide recommends them for grouping related exports.
  Here there is exactly one, `common/components/bento/index.ts`, and the rest
  are deliberately absent — see *Where this repo is narrower* below.
- **Tests live in a `__tests__/` folder** beside the code they cover:
  `pages/expenses/components/__tests__/ExpensesForm.test.tsx`. Mocks go in
  `__tests__/__mocks__/` named `{name}Mock.ts`. The cross-cutting invariant
  suite is the exception and stays in `src/test/invariants/`, because it
  belongs to no feature.
- **Named imports.** Never a wildcard import; it defeats tree-shaking.
  **[enforced]** — `zod` is exempt, `z` is a schema builder.

## Component structure

- **Functional components only**, arrow syntax.
- **File name matches the component name.** `ExpensesForm.tsx` exports
  `ExpensesForm`. A module that deliberately groups several small related
  components is the exception — `ChartAxes.tsx` (`XAxis` / `YAxis` /
  `ReferenceLine`), `ChartSeries.tsx`, `ChartTooltip.tsx`, `AppToaster.tsx`,
  `DataContext.tsx` and `RouteGuards.tsx` — which the guide permits as grouped
  related exports. A module of *helpers* is not that exception: it goes in the
  feature's `utils/` under a camelCase name (`utils/expensesFormHelpers.tsx`),
  never beside the component under a dotted name.
- **Named exports for components.** `export const Foo = () => {}`, no
  `export default`. The exception is a module loaded through `React.lazy`,
  which needs a default export — the guide allows default for page/route
  components, and `lazyRouteModules.ts` is where they are.
- **Single responsibility.** One component, one job.
- **Avoid deep nesting.** Break JSX up before it pyramids.
- **150-line limit.** **[enforced]** — `componentSize.test.ts`. The cap is on
  the component function, not the file: the helpers below it do not count.
  The same cap applies to hooks and utilities via `functionSize.test.ts`.
- **Early returns** for loading and error states.
- **Consistent order:** hooks → variables that are not functions →
  `useEffect` → functions (handlers, derived `useMemo` / `useCallback`) →
  return.
- **Blank line before `return`.** **[enforced]**
- **A guard clause keeps its braces.** The guide asks for the brace-less
  `if (isLoading) return <Loading />`; this repo writes the block. See
  *Where this repo differs* below.
- **PascalCase** components, **camelCase** functions.
- **Loading components mirror** the structure of what they stand in for.
- **Move to `common/` only when genuinely reused.**

## Functions and utilities

- Feature-specific helpers stay in the feature; shared ones go to `constants/`.
- Keep the structure flat; return early instead of nesting.
- **A blank line before every `return`.** **[enforced]** —
  `padding-line-between-statements`. This is the guide's own ✅ example, which
  puts a blank line between the guard clause and the final return. Its "do not
  add an extra blank line before the final return" bans a *second* one, not the
  first. A `return` that is the function's only statement has nothing above it
  to separate, so the rule does not fire.

## Types and interfaces

- **`type` for everything, props included.** This is the one place Budgard
  departs from the guide, which asks for `interface` on component props — see
  *Where this repo differs* below.
- **Props type is named `{ComponentName}Props`** — `ExpensesFormProps`, not a
  bare `Props`.
- **A hook's return type is named `Use{HookName}Return`** when the hook
  declares one — including when it is an alias, so
  `export type UseTagPickerReturn = ReturnType<typeof useTagPicker>`, never
  `TagPickerApi`. A hook returning a primitive (`boolean`, `void`, `Date`)
  needs no named type, and a shared domain model keeps its own name —
  `SavingsRhythm` and `GoalProgress` are models the app passes around, not
  hook plumbing. An *internal* state shape is not a return type: `OtpState`
  and `AlertState` are named for what they hold.
- **`t` is typed once.** A helper that renders a string takes
  `t: TranslateFunction` from `@/constants/translate`. Do not re-declare the
  shape locally — 112 files each had their own, in three different widths.
- `Pick<>` to select, `Omit<>` to remove, `Extract<>` to narrow, `&` to merge.
- Do not reach for `interface` on a utility or a hook return type.

## Naming

- **PascalCase** components, **camelCase** functions, variables and handlers.
- **Booleans read as a question:** `is` / `has` / `should` / `are` prefix —
  `isSubmitting`, `hasError`, `shouldSkipIncome`, `areHapticsEnabled`.
  Three kinds of name are exempt because they are not ours to choose: a DOM or
  Radix prop (`disabled`, `open`, `asChild`), a field on an external payload
  (Stripe's `livemode`), and a name that is a database column or a persisted
  localStorage key (`active` on a recurring row, `biometrics` on the app-lock
  record, `secondaryLoaded` in the snapshot cache) — renaming one of those
  silently changes a wire format or orphans data users already have.
- **Hook files match the hook:** `useTodayLayout.ts` exports `useTodayLayout`.
- **Test files** mirror the source name with `.test.tsx`.

## Comments and documentation

- Prefer a clear name over a comment.
- Document **why**, never **what**.
- JSDoc `@see` when a workaround needs a link; `@todo` sparingly.
- `//` comments for browser quirks and genuine technical limitations.
- Pull complex `useEffect` bodies into named functions instead of explaining
  them inline.
- **No section dividers.** `// --- Helpers ---` used to sit above the helper
  block in 264 files and said nothing the blank line below the component did
  not. A divider earns its place only when it names something the code cannot —
  `// --- OFX ---` over one of two parsers in the same file, or
  `// --- handleExpenseSplit ---` over the block of tests covering it. All 300
  generic ones were removed Sep 2026; the 69 that name a section stayed.
  **The sweep runs twice:** the first pass matched only ASCII `// --- x ---`
  and left 35 box-drawing `// ─── Helpers ───` behind. Grep both dash forms.

---

## Where this repo differs

Two rules on the site the repo knowingly does not follow.

**Props are `type`, not `interface`.** The guide asks for `interface` on
component props. Budgard uses `type ExpensesFormProps = { … }` instead, for one
consistent way to declare a shape rather than two. The guide's *naming* is kept
— `{ComponentName}Props` — only the keyword differs. `src/common/ui/` is
vendored shadcn and keeps whatever upstream ships.

**A guard clause keeps its braces.** The guide's ❌ is the braced single-line
return; here it is the house style:

```ts
if (transactionIds.length === 0) {
  return [];
}
```

not `if (transactionIds.length === 0) return [];`. The block gives the guard a
shape the eye catches while scanning a column of code, which is the same reason
this repo bans ternaries and `&&` in JSX. A sweep of the 686 call sites to the
guide's form was written and rejected on 7 Sep 2026 — do not propose it again.
Both forms are currently present (337 brace-less predate the decision); new code
takes the braces, and neither is worth a churn commit on its own.

## Where this repo is stricter

The guide is silent on these; both are **[enforced]** in `eslint.config.js` for
`src/**` (build scripts and tests are exempt):

- **No ternaries.** Use an `if`/`else` block or a helper that returns early.
- **No `&&` in JSX children.** Use a helper render function with an `if`
  return. Boolean props (`disabled={isSubmitting || !isValid}`) and fallback
  values (`{name || '-'}`) are fine — the rule is about hiding a branch inside
  the markup.

## Where this repo is narrower

**Barrel files, but only one.** The guide recommends barrels for grouping
related exports; it also says to avoid them for large or frequently-updated
sets, and warns they cost tree-shaking. Both cautions bite here, so
`common/components/bento/index.ts` is the only one:

- `common/hooks/dataOps/` is twenty modules that change most weeks — the
  guide's "frequently updated" case exactly.
- `common/components/charts/` and the dialog folders hold components that are
  deliberately `React.lazy`-loaded. A barrel over either would pull the whole
  folder into every chunk that imported one file, undoing the code splitting
  that `npm run budget` exists to protect.
- A feature's `components/` folder is a large, constantly-growing export set.

The bento trio qualifies on every count: three exports, stable, tiny, and
always reached for together.

## Not applicable

The guide's **GraphQL** and **Feature Flags** sections do not apply: this
project uses Supabase and has no flag system.
