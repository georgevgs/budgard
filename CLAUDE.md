# CLAUDE.md

**Code style is <https://react-typescript-style-guide.com/>**, condensed in-repo
at `docs/style-guide.md`. It is the authority for structure, naming, types,
comments and file layout — this file no longer restates any of it.

What follows is only what the guide cannot know: the things that are load-bearing
in *this* repo and will break something real if you get them wrong.

## Stack

React 19, TypeScript (strict), Vite, TailwindCSS, shadcn/ui. Supabase for
backend and auth. PWA on Netlify. Zod, React Hook Form, i18next. Package manager
is **bun**.

---

## 🏛️ Data flow

- **Mutations** go through the operation hooks in `src/common/hooks/dataOps/*`,
  which own optimistic updates and rollback. A new write declares itself through
  `useMutationRunner` — it owns the guard, haptics, rollback, Sentry tag and
  retryable error toast that every mutation shares. Never hand-roll that shell
  again; the optimistic shapes (`prependOptimistic` / `patchOptimistic` /
  `removeOptimistic` / `setScalarOptimistic`) live in `dataOps/helpers.ts`.
  Ten of these hooks have a single feature calling them, and the style guide
  would push each into that feature's `hooks/`; they stay here on purpose,
  because the shared runner and rollback contract are what make this one layer
  rather than twenty. That departure is recorded in `docs/style-guide.md`.
- **Offline queueing covers expenses and incomes only.** `MutationType` and
  `useOfflineSync`'s cases must stay in lock-step — widening one without the
  other silently drops writes.
- **Supabase queries** live at the feature root (`<feature>Api.ts`) and are
  composed into one `dataService` object by `src/common/api/dataService.ts`.
  A shared module has no feature root, so its queries sit beside `dataService`
  instead — `common/api/categoriesApi.ts`, `tagsApi.ts`, `proApi.ts`.
  Service methods end with `rows` / `row` / `maybeRow` / `done` from
  `src/common/api/supabaseCrud.ts`. Keep the query chain spelled out — **every
  embed names its FK explicitly, and that is load-bearing.** A bare embed name
  turned ambiguous once already (PGRST201, white screen on months-old bundles).
  Shared embeds and paging helpers are in `src/common/api/dataAccess.ts`.
- **Pro gating**: every free-tier limit is declared in
  `src/constants/proGates.ts` and asked through `useProGate().allow(...)`.
  Do not read `isPro` and hand-roll a toast + `openUpgrade()` at a new call site.
- **Routes** are lazy-loaded in `src/App.tsx`. A folder under `src/pages/` that
  no route owns is not a page: if several features or the router itself reach
  for it, it belongs under `src/common/`.

## 📂 Directory map

```
src/pages/<feature>/     a feature a route owns: view, components/, hooks/, utils/, <feature>Api.ts
src/common/components/   bento, charts, layout, routing, and genuinely shared components
src/common/components/<module>/
                         a shared module bigger than one file — categories, pro,
                         csvImport — with its own hooks/ and utils/ beneath it
src/common/ui/           shadcn primitives — vendored, do not modify
src/common/hooks/        cross-feature hooks, incl. data/ and dataOps/
src/common/contexts/     the Provider / Context pairs
src/common/api/          dataService composition, query helpers, shared-module APIs
src/config/              external integrations only: supabase, sentry, i18n, sw
src/constants/           app-wide utilities and constants
src/assets/fonts/        the self-hosted woff2 faces
src/design/              tokens and palette
```

- `src/common/components/bento`: `BentoGrid` / `BentoTile` / `TileLabel` — the
  grid language Today and Trends are built from. A new module goes in
  `<feature>/components/tiles/`, never inline in the view.
- Zod schemas live with their feature (`<feature>/validations.ts`) or with a
  shared module (`common/components/categories/validations.ts`);
  `src/constants/validations.ts` holds only the shared primitives they are
  built from — a schema reached from `common/` belongs there too.
- `src/design/tokens.ts`: **every colour in the app.** The only file to edit for
  a theme change — the generated CSS, the pre-paint script in `index.html`, the
  CSP hash in `netlify.toml` and the manifest colours are all built from it by
  `plugins/designTokens.ts`. Components use `bg-primary` / `text-income`, never
  a raw hue.
- `src/design/palette.ts`: the raw values and the written reasoning for each.
  `--border` in particular is set darker than a hairline needs because ~100 call
  sites draw inner rules at `border-border/40`–`/50`; lightening it silently
  deletes them.

## 🔒 Protected files

- Never hand-edit `src/design/tokens.generated.css`, the theme script in
  `index.html`, or the CSP sha256 in `netlify.toml`. Change `src/design/tokens.ts`
  and run `npm run build`; commit what it rewrites.
- Never hand-edit `AGENTS.md`. It is this file, generated for Codex and other
  agents that do not read `CLAUDE.md`. Change **this** file and run
  `npm run sync:agents`; `src/test/invariants/agentDocsParity.test.ts` fails the
  build if the two drift.
- Do not edit `.env*` files unless the user explicitly requests an environment
  configuration change.
- Do not edit dependency lockfiles unless the user explicitly requests a
  dependency change. `bunfig.toml` sets `frozenLockfile = true` on purpose;
  flip it, install, flip it back.

---

## 🧠 UI/UX

`docs/ui-rules.md` is the long form and `docs/ux-principles.md` the conceptual
one. Read `src/design/palette.ts` before changing anything visual. The rules that
constrain new work:

- **A panel is a surface AND a rule.** It sits 2% off the page (`--tile`) and
  carries a hairline (`--tile-ring`). `.surface-card` for the single panel around
  a form or list, `.tile` for a module of a bento grid. A bare `bg-card` with no
  rule is invisible.
- **No ambient colour.** No washes behind a screen, no coloured glow, no tinted
  section bands. Depth is `.lift` (grey shadow). If you want to add coloured
  light somewhere, the answer is no.
- **One slab per screen.** A large accent FILL is allowed only as `.tile-slab` —
  the single figure the screen exists to answer. Everything else takes accent on
  *small* things: a fill, a ring, an ink, a chip. A hue MIXED into a white
  surface is still banned.
- **A fill carries the label the token gives it**, never a hand-picked one.
  `bg-x` and `text-x-foreground` travel together. Seven hues resolve that to
  white; the yellow-green band (gold, lime, mint, income, warning) resolves to
  near-black, because white on those measures 1.2–2.3:1 against near-black's
  7.7–14.9:1. `tokens.test.ts` pins every pairing at 2.3:1 minimum.
- **White on the orange.** Everything riding an accent fill is
  `text-primary-foreground`. It measures 2.46:1 on the brand orange and that is
  the deliberate drinks-can trade; the slab pays it back with weight and size,
  not a darker ink.
- **Over budget is stated, not coloured.** The slab is the brand fill in every
  state. When safe-to-spend goes negative the eyebrow is promoted to
  `.tile-badge` and the figure shows the SIZE of the overspend. Contrast and
  words do the work; do not reach for a second hue.
- **Never borrow a status token as a categorical colour.** `--info`, `--warning`,
  `--income` and `--destructive` mean information, caution, money in and danger.
  A composition chart takes `--foreground` for the bulk and `--primary` for the
  part the user can act on. See `FiftyThirtyTwentyRing`.
- **Greys stay achromatic.** Every value in the `neutral` and `ink` ramps is
  `0 0%`.

### Layout

- **There is no persistent header.** Every screen draws its own via `PageHeader`,
  which decides the back button **from the route** — a screen cannot ship without
  a way out by forgetting to pass one. `TopScrim` keeps the status-bar strip
  legible while content scrolls under it.
- Today and Trends are bento grids: two columns, one full-span slab, half tiles
  below. Tones: `plain` / `slab` / `ink` / `accent` / `ghost` / `bare`. At most
  one `slab` and one `ink` per screen — a second of either flattens the first.
- **Today's order and visible set belong to the user** (`useTodayLayout`,
  localStorage plus the owner-scoped `user_ui_preferences` row). A tile with
  nothing to say returns `null` and gives its cell back rather than leaving a
  hole in the grid.

### Type

- **Never write `font-display` in a component.** The display face is named in
  exactly one place — the `.type-*` scale in `index.css` — and
  `typeScale.test.ts` fails the build if a `.tsx` names it. Use `.type-slab` /
  `.type-figure-xl` / `.type-figure-lg` / `.type-figure` / `.type-figure-sm` for
  numbers, `.type-title` for a screen's name, `.type-heading` for a section's,
  and `TileLabel` for an eyebrow.
- **Do not override a scale class's weight or tracking.** Rank comes from weight;
  a `font-semibold` on top flattens the ladder. Size may be overridden.

---

## ✅ Before you finish

- **I18n**: every user-facing string goes through `t()`, including `aria-label`s.
- **Forms**: Zod schema in the feature's `validations.ts`; disable submit while
  invalid or submitting.
- **A way out**: every modal and flow has a visible cancel or exit.
- **Empty states** explain how to get started; errors offer a retry.
- **Tests**: a test asserts behaviour or pins a regression. Before committing a
  new one, break the line it covers and watch it fail — a test that passes
  against broken code is worse than no test.
- Run `npm run lint`, `npm run test` and `npm run build`.
- `npm run typecheck` runs `tsc -b`, and it has to stay that way. The root
  `tsconfig.json` is `"files": []` plus project references, so a plain
  `tsc --noEmit` compiles **nothing** and exits 0 on a codebase full of
  errors — it read clean for a long time while it was checking no files at
  all. Build mode is what actually walks the two projects.

## 📖 Reference docs

- `docs/style-guide.md` — the code style authority, condensed.
- `docs/architecture.md` — routes, provider tree, `dataOps`, services, schema,
  edge functions. Read before touching data flow.
- `docs/ui-rules.md` — the long form of the UI rules, including colour.
- `docs/ux-principles.md` — conceptual reference (Gestalt, heuristics).
- `docs/household-sharing-design.md` — household sharing (Pro): one owner, one
  partner, `private.can_access_financial_space()` as the shared RLS predicate.
  Read before touching RLS on a finance table.
- `design/brand/README.md` — the authority for icons, launch screens and the
  brand mark.
