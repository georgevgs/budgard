# UI Rules (Strict)

> **`CLAUDE.md` / `AGENTS.md` in the repo root is the authority.** They are the
> same generated rulebook and every agent loads one of them. This document is
> the expanded form of one of its sections — if the two ever disagree, the
> rulebook wins and this file is the one to fix.

These rules are mandatory when building UI.

---

## Type

The display face is named in exactly one place: the `.type-*` scale in
`src/index.css`. A component never writes `font-display`, and
`src/test/invariants/typeScale.test.ts` fails the build if one does.

| class             | for                                          | size      | weight |
| ----------------- | -------------------------------------------- | --------- | ------ |
| `.type-slab`      | the figure a screen exists to answer          | 3.5rem    | 800    |
| `.type-figure-xl` | an amount being entered or inspected          | 2.75rem   | 780    |
| `.type-figure-lg` | the headline figure of a section              | 2rem      | 760    |
| `.type-figure`    | a number inside a module                      | 1.5rem    | 720    |
| `.type-figure-sm` | a number inside a row or a small tile         | 1.25rem   | 700    |
| `.type-title`     | a screen's own name (`PageHeader`)            | 1.375rem  | 720    |
| `.type-heading`   | a section's name                              | 1.0625rem | 700    |
| `.type-wordmark`  | the Budgard logotype                          | 0.9375rem | 700    |
| `.tile-label`     | an eyebrow over a figure (use `TileLabel`)    | 0.625rem  | 700    |

Two rules hold it together:

- **Weight carries rank, not just size.** Overriding a class's weight with a
  `font-semibold` flattens the ladder, and a test rejects it. Size may be
  overridden where a screen genuinely needs a different one — the landing hero,
  the transaction hero — and the weight and tracking come along.
- **Tracking is optical and already set.** It tightens as the scale climbs
  (-0.055em at the top, -0.022em at the bottom) and opens right up for the
  eyebrow, where 10px small caps would otherwise set solid. Never put a
  `tracking-[…]` next to a `.type-*` class.

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
- A panel sits 2% off the page and carries a hairline: use `.surface-card` for
  a single panel, `.tile` for a module of the bento grid. Both resolve to the
  same `--tile` / `--tile-ring` pair. Never a bare `bg-card` — it is invisible.
- No ambient colour: no washes, no coloured glow, no tinted section bands.
  Depth is `.lift` (grey shadow). The source design put an orange bloom under
  the Today slab and the FAB; that is the one thing from it we did not take.
- Accent goes on small things — a fill, a ring, an ink, a chip — and on exactly
  one slab per screen (`.tile-slab`). Greys stay achromatic.
- The slab is the brand fill in every state. Over budget is carried by the
  label and the figure, not by a second hue: the eyebrow is promoted to
  `.tile-badge` (inverted out of the fill — `--foreground` carrying
  `--background`, so it flips correctly in both themes) and the figure shows
  the size of the overspend rather than a signed balance. See
  `SafeToSpendTile`.
- A status token is not a categorical colour. `--info`, `--warning`,
  `--income` and `--destructive` mean information, caution, money in and
  danger; using them to tell chart slices apart hands a generic palette
  semantic names it does not honour, and the card ends up with one hue meaning
  two things. `FiftyThirtyTwentyRing` is the worked example: needs take
  `--foreground` (the unavoidable bulk), wants take `--primary` (the share you
  can actually move), savings take `--income` (money kept — the one place the
  token means what it says), and the status labels below separate by weight
  instead of by a fourth and fifth hue.
- A fill's label is whatever `text-x-foreground` resolves to, never a
  hand-picked colour. Seven hues resolve it to white. The yellow-green band —
  gold, lime, mint, income, warning — resolves it to the app's near-black, and
  that is measured rather than chosen:

  | fill | white | near-black |
  | --- | --- | --- |
  | `--income` light `#00c27b` | 2.34:1 | **7.67:1** |
  | `--income` dark `#00eb95` | 1.58:1 | **11.33:1** |
  | `--warning` light `#dba100` | 2.31:1 | **7.78:1** |
  | lime dark `#beff0a` | 1.20:1 | **14.94:1** |

  White on those is not a bolder choice, it is an unreadable one.
  `tokens.test.ts` holds every pairing at 2.3:1 minimum.
- Everything riding an accent fill is `text-primary-foreground`, at every
  size — a button label, a chip, and the slab's whole contents alike. On the
  brand orange that is white at 2.46:1, the deliberate drinks-can trade the
  palette is built on; the slab earns the read back through weight and size
  rather than a darker ink. There was briefly a fourth role, `--x-deep`, that
  darkened the hue for the slab alone; on orange it produced a near-black
  caption stamped on a coloured box, and it is gone. See the role rule in
  `src/design/tokens.ts`.

See `src/design/palette.ts` for the written reasoning behind each value.

---

## Type

The display face is named in exactly one place: the `.type-*` scale in
`src/index.css`. A component never writes `font-display`, and
`src/test/invariants/typeScale.test.ts` fails the build if one does.

| class             | for                                          | size      | weight |
| ----------------- | -------------------------------------------- | --------- | ------ |
| `.type-slab`      | the figure a screen exists to answer          | 3.5rem    | 800    |
| `.type-figure-xl` | an amount being entered or inspected          | 2.75rem   | 780    |
| `.type-figure-lg` | the headline figure of a section              | 2rem      | 760    |
| `.type-figure`    | a number inside a module                      | 1.5rem    | 720    |
| `.type-figure-sm` | a number inside a row or a small tile         | 1.25rem   | 700    |
| `.type-title`     | a screen's own name (`PageHeader`)            | 1.375rem  | 720    |
| `.type-heading`   | a section's name                              | 1.0625rem | 700    |
| `.type-wordmark`  | the Budgard logotype                          | 0.9375rem | 700    |
| `.tile-label`     | an eyebrow over a figure (use `TileLabel`)    | 0.625rem  | 700    |

Two rules hold it together:

- **Weight carries rank, not just size.** Overriding a class's weight with a
  `font-semibold` flattens the ladder, and a test rejects it. Size may be
  overridden where a screen genuinely needs a different one — the landing hero,
  the transaction hero — and the weight and tracking come along.
- **Tracking is optical and already set.** It tightens as the scale climbs
  (-0.055em at the top, -0.022em at the bottom) and opens right up for the
  eyebrow, where 10px small caps would otherwise set solid. Never put a
  `tracking-[…]` next to a `.type-*` class.

---

## Layout

- There is no app bar. Every screen draws its own header via `PageHeader`,
  which decides the back button from the route — a screen cannot ship without
  a way out by forgetting to pass one. `TopScrim` keeps the status-bar strip
  legible while content scrolls under it.
- Mobile dialogs are bottom sheets and use their handle or draggable header to
  swipe closed. The shared top-right close button is hidden below `sm` and
  remains visible on desktop, where drag dismissal is disabled. A committed
  swipe continues from the finger's release position; the sheet stays opaque
  while it exits and the backdrop owns the fade.
- Today and Trends are bento grids: `BentoGrid` + `BentoTile`, two columns,
  one full-span slab, half tiles under it. Tones are `plain` / `slab` / `ink` /
  `accent` / `ghost` / `bare` — at most one `ink` and one `slab` per screen.
- Today's grid is the user's: order and visibility live in `useTodayLayout`
  (localStorage for the instant/offline copy, synchronized through the
  owner-scoped `user_ui_preferences` row). A tile with nothing to say returns
  `null` and gives its cell back.

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
