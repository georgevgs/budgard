# Style Guide

> **Source: <https://react-typescript-style-guide.com/> (MIT).** This is a
> condensed, in-repo copy so an agent or a reviewer without a browser still has
> the rules. The owner's global rules (`~/.agents/AGENTS.md`) come first: where
> they and this file disagree, the global rules win and this file is the one to
> fix. Below them, the site is the authority for everything they leave open.
>
> The global rules apply to every line written or touched. Code that predates
> them and is not being changed stays as it is, so the existing named exports,
> render helpers, the bento barrel and `x === null` checks are history, not
> precedent.
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
- **Positive checks.** The only early return is a top-of-function null guard.
  Real branches are `if`/`else`, with one branch extracted into a named
  function or a sub-component.
- **Separation of concerns.** Logic, UI and state stay apart.

## Folder structure

- **Feature-based.** Each feature owns a folder under `src/pages/`.
- **Hooks placement.** A feature's hooks live in `<feature>/hooks/`. A shared
  module under `common/components/` does the same with its own private hooks —
  `charts/hooks/useChartSize.ts`. `common/hooks/` is for hooks that genuinely
  cross features; a hook only its own module calls does not belong there.
- **Common folder.** Shared components, hooks and utilities go in `src/common/`.
  A shared module that is more than one component keeps its parts together as
  `common/components/<module>/`, with its own `hooks/` and `utils/` beneath it —
  `common/components/categories/`, `common/components/pro/`,
  `common/components/csvImport/`. `src/pages/` is for features a route or a
  screen actually owns; a folder there consumed by several features, or by the
  router itself, was never a page and belongs under `common/`.
- **Config folder.** External integrations only (Supabase, Sentry, i18n, the
  service worker).
- **Constants folder.** App-wide constants and utilities used by more than one
  feature.
- **Queries at the feature root.** A feature's Supabase queries live in
  `<feature>/<feature>Api.ts`, so an audit of what it reads and writes is one
  file. (The guide says this about GraphQL; Supabase is our equivalent.) A
  shared module's queries sit beside `dataService` instead —
  `common/api/categoriesApi.ts`, `tagsApi.ts`, `proApi.ts` — because the module
  is not a feature and has no feature root to live at.
- **No new barrel files.** The global rules ban them. The one that predates
  them, `common/components/bento/index.ts`, stays until it is touched — see
  _Barrel files_ below.
- **One component per PascalCase folder.** A new component lives at
  `<feature>/components/ExpensesForm/ExpensesForm.tsx`. The flat
  `components/ExpensesForm.tsx` files are history.
- **Tests live in a `__tests__/` folder** beside the code they cover:
  `pages/expenses/components/__tests__/ExpensesForm.test.tsx`. Mocks go in
  `__tests__/__mocks__/` named `{name}Mock.ts`. The cross-cutting invariant
  suite is the exception and stays in `src/test/invariants/`, because it
  belongs to no feature.
- **Assets.** Font files live in `src/assets/fonts/`, as the guide asks;
  `src/design/fonts.css` declares the faces and reaches across to them.
- **Named imports.** Never a wildcard import; it defeats tree-shaking.
  **[enforced]** — `zod` is exempt, `z` is a schema builder.

## Component structure

- **Functional components only**, arrow syntax.
- **File name matches the component name.** `ExpensesForm.tsx` exports
  `ExpensesForm`. The modules that group several small related components
  (`ChartAxes.tsx`, `ChartSeries.tsx`, `ChartTooltip.tsx`, `AppToaster.tsx`,
  `DataContext.tsx`, `RouteGuards.tsx`) predate the global rules. New code puts
  one component in each folder. Small helpers a component introduces live below
  its default export with inline `{ prop: Type }` types. A module of shared
  _helpers_ goes in the feature's `utils/` under a camelCase name
  (`utils/expensesFormHelpers.tsx`), never beside the component under a dotted
  name.
- **Default export for components.** A new component is the default export of
  its file. The `export const Foo = () => {}` components that predate the global
  rules keep their named export until the file is rewritten, so their importers
  do not churn.
- **Single responsibility.** One component, one job.
- **Avoid deep nesting.** Break JSX up before it pyramids.
- **150-line limit.** **[enforced]** — `componentSize.test.ts`. The cap is on
  the component function, not the file: the helpers below it do not count.
  The same cap applies to hooks and utilities via `functionSize.test.ts`.
- **Loading and error states** come from one status enum
  (`IDLE`/`LOADING`/`SUCCESS`/`ERROR`), and each gets its own sub-component. The
  parent branches on the status with `if`/`else`, not with early returns.
- **Consistent order:** hooks → variables that are not functions →
  `useEffect` → functions (handlers, derived `useMemo` / `useCallback`) →
  return.
- **Blank line before `return`.** **[enforced]**
- **A guard clause keeps its braces.** The guide asks for the brace-less
  `if (isLoading) return <Loading />`; this repo writes the block.
  **[enforced]** — `curly`. See _Where this repo differs_ below.
- **A component body keeps its `return`**, even with no logic — not the guide's
  implicit `() => <section>…`. **[enforced]** — `componentReturn.test.ts`.
  See _Where this repo differs_ below.
- **PascalCase** components, **camelCase** functions.
- **Loading components mirror** the structure of what they stand in for.
- **Move to `common/` only when genuinely reused.**

## Functions and utilities

- Feature-specific helpers stay in the feature; shared ones go to `constants/`.
- Keep the structure flat by extracting a branch into a named function, not by
  returning early. The only early return is a top-of-function null guard.
- **A blank line before every `return`.** **[enforced]** —
  `padding-line-between-statements`. This is the guide's own ✅ example, which
  puts a blank line between the guard clause and the final return. Its "do not
  add an extra blank line before the final return" bans a _second_ one, not the
  first. A `return` that is the function's only statement has nothing above it
  to separate, so the rule does not fire.

## Types and interfaces

- **`type` for everything, props included.** This is the one place Budgard
  departs from the guide, which asks for `interface` on component props — see
  _Where this repo differs_ below.
- **Props type is named `{ComponentName}Props`** — `ExpensesFormProps`, not a
  bare `Props`.
- **A hook's return type is named `Use{HookName}Return`** when the hook
  declares one — including when it is an alias, so
  `export type UseTagPickerReturn = ReturnType<typeof useTagPicker>`, never
  `TagPickerApi`. A hook returning a primitive (`boolean`, `void`, `Date`)
  needs no named type, and a shared domain model keeps its own name —
  `SavingsRhythm` and `GoalProgress` are models the app passes around, not
  hook plumbing. An _internal_ state shape is not a return type: `OtpState`
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
- Comment only a library or browser quirk, or a domain-format construct (a
  regex for a valid VAT number gets a one-line format note). Why-this-hook
  rationale goes in the PR, not the file. No `@todo`.
- JSDoc `@see` when a quirk's workaround needs a link.
- Comment voice: short plain sentences, comma splices over semicolons, "do
  not" over "don't", no em or en dashes, no emojis.
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

Four rules on the site the repo knowingly does not follow.

**Props are `type`, not `interface`.** The guide asks for `interface` on
component props. Budgard uses `type ExpensesFormProps = { … }` instead, for one
consistent way to declare a shape rather than two. The guide's _naming_ is kept
— `{ComponentName}Props` — only the keyword differs. `src/common/ui/` is
vendored shadcn and keeps whatever upstream ships.

**A guard clause keeps its braces.** The guide's ❌ is the braced single-line
return; here it is the house style:

```ts
if (null === account) {
  return [];
}
```

not `if (null === account) return [];`. Under the global rules this
top-of-function null guard is the only early return, and its condition is a
Yoda check. The block gives the guard a
shape the eye catches while scanning a column of code, which is the same reason
this repo bans ternaries and `&&` in JSX. A sweep to the guide's form was
written and rejected on 7 Sep 2026 — do not propose it again.

**[enforced]** — `curly: ['error', 'all']`. It was conventional for months and
both forms drifted side by side, ~530 of them brace-less; the sweep to the
house form ran on 7 Sep 2026 and the rule now holds the line. `eslint --fix`
collapses a guard onto one line rather than expanding it, so a bulk run of that
fixer needs the blocks re-expanded afterwards.

**A component body keeps its `return`.** The guide asks for the implicit form
when a component has no logic — `export const Profile = () => <section>…`.
Here the braced body stays:

```tsx
export const TileLabel = ({ children, className }: TileLabelProps) => {
  return <p className={cn('tile-label', className)}>{children}</p>;
};
```

Same reason as the guard clause: one shape for every function in the file, so
adding a line of logic later is not also a reformat.

**[enforced]** — `componentReturn.test.ts`. This was the last house rule that
was only written down, and it had drifted the same way `curly` did: sixteen
components had taken the implicit form, nine of them not exported and so
invisible to a grep anchored on `export const`. The sweep to the braced form
ran on 7 Sep 2026 and the test now holds the line. The rule is about
_components_ — a lowercase render helper passed to `.map()` keeps the implicit
form, which is why `renderSection` and `renderDot` are untouched. They predate
the global rules, which ban `{renderX()}`: new code extracts a sub-component.

**`dataOps/` stays whole.** Some operation hooks in
`common/hooks/dataOps/` are called by exactly one feature, and the guide would
send each of them into that feature's `hooks/`. They stay: `dataOps` is the
mutation layer, and `useMutationRunner`, the optimistic-shape helpers and the
rollback contract are what make it one layer rather than twenty. Splitting it
by consumer would trade a rule the architecture depends on for a rule about
where files sit. See CLAUDE.md's _Data flow_ section.

## Where this repo is stricter

The guide is silent on these; both are **[enforced]** in `eslint.config.js` for
`src/**` (build scripts and tests are exempt):

- **No ternaries.** Use an `if`/`else` block or a small named helper.
- **No `&&` in JSX children.** A render-or-null sub-component takes one
  `isVisible` boolean from the parent, which branches on plain data. Boolean
  props (`disabled={true === isSubmitting || false === isValid}`) are fine.
  A truthy fallback (`{name || '-'}`) is not, write the check out
  (`null !== name && '' !== name`).

The global rules add more that this repo's eslint does not check: no `?.`, no
`let`, Yoda conditions, explicit null and empty checks, `OrNull` names.
`house-lint` (see `~/.agents/AGENTS.md`) checks them on every new line, after
each agent edit and on every commit.

## Barrel files

The global rules ban barrels outright, so no new one is added. What follows is
why the existing one was the only one even before that.

Not a deviation — the guide's own avoid-list, applied. It recommends barrels
"wherever applicable", then names the cases where they are not: a large export
set, a frequently-updated file, and the tree-shaking cost. Every candidate
folder here trips one of those, so `common/components/bento/index.ts` is the
only barrel:

- `common/hooks/dataOps/` holds modules that change most weeks — the
  guide's "frequently updated" case exactly.
- `common/components/charts/` and the dialog folders hold components that are
  deliberately `React.lazy`-loaded. A barrel over either would pull the whole
  folder into every chunk that imported one file, undoing the code splitting
  that `npm run budget` exists to protect.
- A feature's `components/` folder is a large, constantly-growing export set.

- `src/types/` looks like the free case, because 359 of its 373 imports are
  `import type` and erase at build. It is not: two modules there export runtime
  values (`isLiability`, `DEBT_KINDS`), and a schema change would invalidate
  every one of those 373 consumers — the guide's "frequently updated" caution,
  at the widest fan-out in the codebase.

The bento trio qualifies on every count: three exports, stable, tiny, and
always reached for together.

## Not applicable

The guide's **GraphQL** and **Feature Flags** sections do not apply: this
project uses Supabase and has no flag system.
