# UI Rules (Strict)

> **`CLAUDE.md` / `AGENTS.md` in the repo root is the authority.** They are the
> same generated rulebook and every agent loads one of them. This document is
> the expanded form of one of its sections — if the two ever disagree, the
> rulebook wins and this file is the one to fix.

These rules are mandatory when building UI.

---

## Layout & Structure

- Group related elements using spacing or containers
- Do not mix unrelated actions in the same section
- Use vertical flow for readability
- Avoid dense layouts — prefer whitespace

---

## Actions

- Each screen must have **one clear primary action**
- Primary buttons must be visually consistent across the app
- Do not place destructive actions next to primary actions
- Secondary actions must be visually de-emphasized

---

## Feedback

Every user action must provide feedback:

- Loading → spinner, skeleton, or disabled state
- Success → visible confirmation (UI update or message)
- Error → clear, human-readable message

---

## Forms

- Must have inline validation
- Do not rely only on toasts for errors
- Disable submit when invalid
- Show field-level error messages

---

## Lists & Content

- Lists must be vertically aligned and scannable
- Important information must appear first
- Avoid visual noise

---

## Consistency

- Same action = same style everywhere
- Same component = same behavior everywhere
- Do not introduce new UI patterns without reason

---

## Colour

- Every colour comes from `src/design/tokens.ts`. Use `bg-primary` /
  `text-income`; never a raw hue.
- Page and card are the same colour — a panel exists because `--border` draws
  it. Use `.surface-card` or a `border`; a `bg-card` with no rule is invisible.
- No ambient colour: no washes, no coloured glow, no tinted section bands.
  Depth is `.lift` (grey shadow).
- Accent goes on small things — a fill, a ring, an ink, a chip — never a card
  body. Greys stay achromatic.

See `src/design/palette.ts` for the written reasoning behind each value.

---

## Accessibility (Baseline)

- Buttons must be clearly distinguishable
- Do not rely on color alone for meaning
- Interactive elements must have clear states

---

## Anti-Patterns (Never Do)

- Multiple competing primary actions
- No loading state
- Hidden errors
- Overloaded screens