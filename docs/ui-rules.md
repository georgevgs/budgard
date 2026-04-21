# UI Rules (Strict)

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