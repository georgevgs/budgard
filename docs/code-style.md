# Code Style

Guiding principle: **human-readable code**

---

## Variables and Values

- Use `const` by default
- Use `let` only when reassigned
- Never use `var`
- Prefer destructuring when it improves clarity
- Use object shorthand
- Use spread for shallow copies
- Use template literals
- Always use `===` / `!==`

---

## Functions

- Use arrow functions for callbacks
- Name every function
- Event handlers: `handle*`
- Keep functions small and focused
- Prefix unused params with `_`

---

## TypeScript

- Full typing on all functions
- No `any` → use `unknown`
- Prefer `type` over `interface`
- Do not suppress TypeScript errors
- Keep strict mode clean

---

## React Components

- One component per file
- Arrow function components
- Props typed and destructured
- Boolean props: `is*`, `has*`
- Keep under ~100 lines

---

## Conditional Rendering

- No ternaries in JSX
- No `&&` rendering
- Use helper render functions

---

## Hooks

- Prefix with `use`
- Extract reusable logic
- Honest dependency arrays
- No conditional hooks

---

## Imports

1. External
2. Internal (`@/*`)
3. Types

- No unused imports
- No default exports for utilities/hooks

---

## Naming

- PascalCase → components
- camelCase → variables/functions
- UPPER_SNAKE_CASE → constants
- No abbreviations

---

## State and Data

- Never mutate state
- Prefer `.map`, `.filter`, `.reduce`
- Derived values should not be state

---

## Array Keys

- Must be stable IDs
- Never use index

---

## No Magic Values

- Extract constants

---

## Error Handling

- Handle errors explicitly
- Validate only at boundaries

---

## Formatting

- Prettier enforced
- Blank line before `return`
- No `console.log`