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
- Do not edit `.env*` files unless the user explicitly requests an environment configuration change.
- Do not edit dependency lockfiles unless the user explicitly requests a dependency change.

---

## 🧠 UI/UX Philosophy

### Visual Direction: white, black, and accent only where it means something
The app is a white page with white cards on it. Read `src/design/palette.ts`
before changing anything visual — the reasoning is written there — but the four
rules that constrain new work are:

- **The rule is the separation.** Page and card are the same colour in both
  themes; a panel exists because `--border` draws it. Use `.surface-card` (or a
  `border`) — a `bg-card` with no rule is invisible.
- **No ambient colour.** No washes behind a screen, no coloured glow, no tinted
  section bands. Depth is `.lift` (grey shadow). If you want to add coloured
  light somewhere, the answer is no.
- **Never tint a large surface with an accent.** A hue mixed into a white
  surface lands in the beige band the app was repainted to escape. Accent goes
  on *small* things — a fill, a ring, an ink, a chip — never a card body.
- **Greys stay achromatic.** Every value in the `neutral` and `ink` ramps is
  `0 0%`. A hue in the ground is a cast over the whole app.

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
