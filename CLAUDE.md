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
- **Services**: All external communication (`services/dataService.ts`).
- **Context**: Global state (e.g., `AuthProvider`). Max 2 levels of prop drilling.
- **Mutations**: Must use `hooks/useDataOperations.ts` for optimistic updates + rollback logic.
- **Routing**: Lazy-load all routes in `src/App.tsx`.

## 📂 Directory Map
- `src/components/ui`: shadcn primitives (do not modify)
- `src/components/features`: Business-specific components
- `src/hooks`: Data fetching and state logic
- `src/services`: Pure API/Supabase logic
- `src/lib/validations.ts`: ALL Zod schemas/

---

## 🧠 UI/UX Philosophy

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