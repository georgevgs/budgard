# CLAUDE.md

Rules for working in this repository. Follow them exactly.

## Stack
- **Frontend**: React 19, TypeScript (Strict), Vite, TailwindCSS, shadcn/ui.
- **Backend/Auth**: Supabase.
- **Deployment**: PWA on Netlify.
- **Tools**: Zod, React Hook Form, i18next.

---

## 🏛️ Architecture & Data Flow
- **Components**: UI rendering only. No direct Supabase/API calls.
- **Hooks**: Business logic and state orchestration.
- **Services**: All external communication (`src/services/*`).
- **Context**: Global state (e.g., `AuthProvider`). Max 2 levels of prop drilling.
- **Mutations**: Must use the operation hooks in `src/hooks/dataOps/*` for optimistic updates + rollback logic.
- **Routing**: Lazy-load all routes in `src/App.tsx`.

## 📂 Directory Map
- `src/components/ui`: shadcn primitives (do not modify)
- `src/components/bento`: `BentoGrid` / `BentoTile` / `TileLabel` — the grid
  language Today and Trends are built from. A new module goes in
  `<feature>/tiles/`, never inline in the view.
- `src/components/<feature>`: Business-specific components grouped by feature
- `src/hooks`: Data fetching and state logic
- `src/services`: Pure API/Supabase logic
- `src/lib/validations.ts`: All Zod schemas
- `src/design/tokens.ts`: **Every colour in the app.** The only file to edit for a
  theme change — the generated CSS, the pre-paint script in `index.html`, the CSP
  hash in `netlify.toml` and the manifest colours are all built from it by
  `plugins/designTokens.ts`. Components use `bg-primary` / `text-income` and never
  a raw hue.
- `src/design/palette.ts`: the raw values behind those tokens, and the written
  reasoning for each one. `--border` in particular is set darker than a hairline
  needs because ~100 call sites draw inner rules at `border-border/40`–`/50`;
  lightening it silently deletes them.

## Protected Files
- Never hand-edit `src/design/tokens.generated.css`, the theme script in
  `index.html`, or the CSP sha256 in `netlify.toml`. Change `src/design/tokens.ts`
  and run `npm run build`; commit what it rewrites.
- Never hand-edit `AGENTS.md`. It is this file, generated for Codex and other
  agents that do not read `CLAUDE.md`. Change **this** file and run
  `npm run sync:agents`; `src/test/invariants/agentDocsParity.test.ts` fails the
  build if the two drift.
- Do not edit `.env*` files unless the user explicitly requests an environment configuration change.
- Do not edit dependency lockfiles unless the user explicitly requests a dependency change.

---

## 📖 Reference Docs
This file is the authority. `docs/` holds the expanded form of these sections —
read the relevant one before a non-trivial change, and fix it if it disagrees
with this file.

- `docs/architecture.md` — routes, provider tree, `dataOps`, services, schema,
  edge functions. Read before touching data flow.
- `docs/code-style.md` — the long form of the Code Style rules below.
- `docs/ui-rules.md` — the long form of the UI/UX rules, including colour.
- `docs/ux-principles.md` — conceptual reference (Gestalt, heuristics).
- `docs/household-sharing-design.md` — a design doc for an **unimplemented**
  feature. Nothing in the codebase corresponds to it.
- `design/brand/README.md` — the authority for icons, launch screens and the
  brand mark.

---

## 🧠 UI/UX Philosophy

### Visual Direction: white, black, and accent only where it means something
The app is a white page carrying a grid of near-white modules. Read
`src/design/palette.ts` before changing anything visual — the reasoning is
written there — but the five rules that constrain new work are:

- **A panel is a surface AND a rule.** It sits 2% off the page (`--tile`) and
  carries a hairline (`--tile-ring`). Use `.surface-card` for the single panel
  around a form or a list, `.tile` for a module of a bento grid; both resolve
  to the same pair. A bare `bg-card` with no rule is invisible.
- **No ambient colour.** No washes behind a screen, no coloured glow, no tinted
  section bands. Depth is `.lift` (grey shadow). If you want to add coloured
  light somewhere, the answer is no.
- **One slab per screen.** A large accent FILL is allowed, and only as
  `.tile-slab` — the single figure the screen exists to answer. Everything else
  takes accent on *small* things: a fill, a ring, an ink, a chip. A hue MIXED
  into a white surface is still banned; that lands in the beige band the app
  was repainted to escape.
- **White on the orange.** Everything riding an accent fill — a button label,
  a chip, the slab's whole contents — is `text-primary-foreground`. It measures
  2.46:1 on the brand orange and that is the deliberate drinks-can trade the
  palette is built on; the slab pays it back with weight and size (`.type-slab`
  is 800 at 3.5rem), not with a darker ink. The yellow-green accents flip the
  label to near-black on their own, in the token. See the role rule in
  `tokens.ts`.
- **A fill carries the label the token gives it, never a hand-picked one.**
  `bg-x` and `text-x-foreground` travel together. Seven hues resolve that to
  white; the yellow-green band (gold, lime, mint, income, warning) resolves it
  to the app's near-black, because white on those measures 1.2–2.3:1 against
  near-black's 7.7–14.9:1. That is physics, not a style choice — `tokens.test.ts`
  pins every pairing at 2.3:1 minimum, so a fill can never ship with a label
  that cannot be read on it.
- **Over budget is stated, not coloured.** The slab is the brand fill in every
  state. When safe-to-spend goes negative the eyebrow is promoted to
  `.tile-badge` — inverted out of the fill, `--foreground` carrying
  `--background` — and the figure shows the SIZE of the overspend rather than a
  signed balance. Contrast and words do the work; do not reach for a second hue.
- **Never borrow a status token as a categorical colour.** `--info`,
  `--warning`, `--income` and `--destructive` mean information, caution, money
  in and danger. Reaching for them to tell three slices of a chart apart gives
  a generic chart palette semantic names it does not honour, and the same hue
  then means two things on one screen. A composition chart takes the app's own
  colours — `--foreground` for the bulk, `--primary` for the part the user can
  act on, a status token only where it genuinely means what it says. See
  `FiftyThirtyTwentyRing`.
- **Greys stay achromatic.** Every value in the `neutral` and `ink` ramps is
  `0 0%`. A hue in the ground is a cast over the whole app.

### Layout: no app bar, and Today is the user's
- There is no persistent header. Every screen draws its own via `PageHeader`,
  which decides the back button **from the route** — a screen cannot ship
  without a way out by forgetting to pass one. `TopScrim` keeps the status-bar
  strip legible while content scrolls under it.
- Today and Trends are bento grids: `BentoGrid` + `BentoTile`, two columns, one
  full-span slab, half tiles below. Tones: `plain` / `slab` / `ink` / `accent` /
  `ghost` / `bare`. At most one `slab` and one `ink` per screen — a second of
  either flattens the first.
- Today's order and visible set belong to the user (`useTodayLayout`,
  localStorage for instant/offline reads plus the owner-scoped
  `user_ui_preferences` row for cross-device sync). A tile with nothing to say
  returns `null` and gives its cell back rather than leaving a hole in the grid.

### Type: weight carries rank
- **Never write `font-display` in a component.** The display face is named in
  exactly one place — the `.type-*` scale in `index.css` — and a test fails the
  build if a `.tsx` names it. Use `.type-slab` / `.type-figure-xl` /
  `.type-figure-lg` / `.type-figure` / `.type-figure-sm` for numbers,
  `.type-title` for a screen's name, `.type-heading` for a section's, and
  `TileLabel` (`.tile-label`) for an eyebrow.
- **Do not override a scale class's weight.** Rank comes from weight — 800 for
  the figure a screen exists to answer, down to 700 for a section heading — and
  a `font-semibold` on top of it flattens the ladder. Size may be overridden
  (`class="type-figure-xl text-[2.5rem]"`); weight and tracking may not.
- **Tracking is optical and already set.** It tightens as the scale climbs and
  opens up for the 10px eyebrow. Never add a `tracking-[…]` next to a
  `.type-*` class.

### Gestalt Principles (Visual Hierarchy)
- **Proximity**: Related items (labels/inputs) must be physically close. Use `space-y-*` or `gap-*` consistently.
- **Similarity**: Elements with the same function (e.g., all "Delete" buttons) must share the same visual style.
- **Common Region**: Use Cards or distinct background colors to group related data.
- **Figure/Ground**: Use shadows and overlays to clearly separate modals/popovers from the main UI.

### 10 Usability Heuristics (Implementation)
1. **System Status**: Always show loaders/skeletons. Provide immediate feedback on click.
2. **Real-world Match**: Use human language, not dev-speak (e.g., "Saved" vs "200 OK").
3. **User Control**: Every modal/flow must have an "Exit" or "Cancel" option.
4. **Consistency**: Follow shadcn/ui defaults; do not create custom button variants unless necessary.
5. **Error Prevention**: Disable "Submit" buttons for invalid forms. Use Zod for real-time validation.
6. **Recognition**: Use standard icons (Lucide) for common actions (Trash = Delete).
7. **Flexibility**: Use keyboard shortcuts and focus states for power users.
8. **Minimalism**: Remove any element that doesn't support the user's current goal.
9. **Error Recovery**: If an API call fails, explain why and provide a "Try Again" button.
10. **Help**: Ensure empty states explain how to get started.

---

## ✍️ Code Style: "Human-Readable First"

### Control Flow (Strict)
- **No Ternary Operators**: Use `if/else` blocks.
- **No `&&` in JSX**: Use helper render functions with `if` returns.
- **Early Returns**: Handle failures/edge cases first; happy path last.
- **Spacing**: Mandatory blank line before all `return` statements.

### Functions & Components
- **Arrow Functions**: Use for components, helpers, and callbacks. No `function` keyword.
- **Structure**: 1. Component (max 100 lines) -> 2. `export default` -> 3. `// --- Helpers ---` section.
- **Props**: Use `type Props = {...}`, destructure in signature.

### TypeScript
- **Prefer `type`** over `interface`.
- **No `any`**: Use `unknown` if a type is volatile.
- **No `ts-ignore`**: Resolve errors; do not suppress them.

---

## 🛠️ Development Workflow Checklist
- [ ] **Heuristics Check**: Does the user have a "way out"? Is there a loading state?
- [ ] **Gestalt Check**: Is the spacing between unrelated sections larger than spacing within sections?
- [ ] **Path Aliases**: Always use `@/*` for internal paths.
- [ ] **I18n**: All user-facing strings must use `t()`.
- [ ] **Form Logic**: Zod schema defined in `src/lib/validations.ts`?

---

## ⚖️ Conflict Resolution
If rules overlap, prioritize in this order:
1. **Readability** (Is it easy for a human to scan?)
2. **Logic Flow** (Are there early returns and no ternaries?)
3. **Architecture** (Is the logic in the right layer?)
