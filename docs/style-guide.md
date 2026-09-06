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
- **Hooks placement.** A feature's hooks live in `<feature>/hooks/`.
- **Common folder.** Shared components, hooks and utilities go in `src/common/`.
- **Config folder.** External integrations only (Supabase, Sentry, i18n, the
  service worker).
- **Constants folder.** App-wide constants and utilities used by more than one
  feature.
- **Queries at the feature root.** A feature's Supabase queries live in
  `<feature>/<feature>Api.ts`, so an audit of what it reads and writes is one
  file. (The guide says this about GraphQL; Supabase is our equivalent.)
- **Barrel files.** Use judiciously — they invite circular dependencies.
- **Named imports.** Never a wildcard import; it defeats tree-shaking.
  **[enforced]** — `zod` is exempt, `z` is a schema builder.

## Component structure

- **Functional components only**, arrow syntax.
- **File name matches the folder** it defines.
- **Single responsibility.** One component, one job.
- **Avoid deep nesting.** Break JSX up before it pyramids.
- **150-line limit.** **[enforced]** — `componentSize.test.ts`. The cap is on
  the component function, not the file: helpers below `export default` do not
  count. The same cap applies to hooks and utilities via
  `functionSize.test.ts`.
- **Early returns** for loading and error states.
- **Consistent order:** hooks → derived values → handlers → return.
- **Blank line before `return`.** **[enforced]**
- **Single-line early returns** stay inline, without braces.
- **PascalCase** components, **camelCase** functions.
- **Loading components mirror** the structure of what they stand in for.
- **Move to `common/` only when genuinely reused.**

## Functions and utilities

- Feature-specific helpers stay in the feature; shared ones go to `constants/`.
- Keep the structure flat; return early instead of nesting.
- No blank line before a `return` that is the function's first statement.

## Types and interfaces

- **`type` for everything, props included.** This is the one place Budgard
  departs from the guide, which asks for `interface` on component props — see
  *Where this repo differs* below.
- `Pick<>` to select, `Omit<>` to remove, `&` to merge.
- Do not reach for `interface` on a utility or a hook return type.

## Comments and documentation

- Prefer a clear name over a comment.
- Document **why**, never **what**.
- JSDoc `@see` when a workaround needs a link; `@todo` sparingly.
- `//` comments for browser quirks and genuine technical limitations.
- Pull complex `useEffect` bodies into named functions instead of explaining
  them inline.

---

## Where this repo differs

**Props are `type`, not `interface`.** The guide asks for `interface` on
component props. Budgard uses `type Props = { … }` everywhere instead, for one
consistent way to declare a shape rather than two. `src/common/ui/` is vendored
shadcn and keeps whatever upstream ships.

## Where this repo is stricter

The guide is silent on these; both are **[enforced]** in `eslint.config.js` for
`src/**` (build scripts and tests are exempt):

- **No ternaries.** Use an `if`/`else` block or a helper that returns early.
- **No `&&` in JSX children.** Use a helper render function with an `if`
  return. Boolean props (`disabled={isSubmitting || !isValid}`) and fallback
  values (`{name || '-'}`) are fine — the rule is about hiding a branch inside
  the markup.

## Not applicable

The guide's **GraphQL** and **Feature Flags** sections do not apply: this
project uses Supabase and has no flag system.
