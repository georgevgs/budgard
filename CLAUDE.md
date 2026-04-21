# CLAUDE.md

This file defines the **rules you must always follow** when working in this repository.

---

# Critical Rules (Always Follow)

- No ternary operators in JSX
- No `&&` conditional rendering
- Never mutate state directly
- Every async action must handle:
  - loading state
  - error state
- All forms must use Zod validation
- Keep components under ~100 lines
- Use named functions — no anonymous function declarations
- No unused variables, imports, or params

---

# Development Workflow

When implementing features:

1. Follow architecture in `docs/architecture.md`
2. Follow code style in `docs/code-style.md`
3. Follow UI rules in `docs/ui-rules.md`

If rules conflict:
1. Readability
2. Code style
3. UI rules

---

# When Creating a New Component

1. Define a `Props` type
2. Destructure props in the signature
3. Keep logic simple and focused
4. Extract helper render functions for conditionals
5. Add loading and error states if applicable
6. Follow UI rules

---

# When Modifying Existing Code

- Do not introduce new patterns
- Stay consistent with surrounding code
- Do not refactor unrelated parts

---

# UX Reference

For deeper design reasoning:
See `docs/ux-principles.md`