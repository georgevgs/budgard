/**
 * Tier 1 — primitives.
 *
 * Raw colour values with no meaning attached. Nothing in the app may read
 * these directly: components consume Tailwind classes, which resolve to the
 * semantic tokens in `tokens.ts`, which are the only things allowed to name a
 * primitive. That one rule is what makes a colour change a one-line edit.
 *
 * Values are stored as bare HSL triples ("H S% L%") because every consumer
 * wraps them in `hsl(... / <alpha>)` — keeping the alpha slot free is what
 * lets `bg-primary/10` work at all.
 */

export type Hsl = string;

/** Neutral greys — the light theme's canvas, surfaces and rules. */
export const neutral = {
  0: '0 0% 100%',
  50: '0 0% 96%',
  100: '0 0% 94%',
  200: '0 0% 88%',
  500: '0 0% 42%',
  700: '0 0% 13%',
  800: '0 0% 10%',
  900: '0 0% 9%',
} as const;

/** Warm-tinted darks — the dark theme's canvas and surfaces. */
export const ink = {
  950: '24 12% 5%',
  900: '24 10% 10%',
  800: '24 9% 15%',
  700: '24 9% 17%',
  500: '26 8% 34%',
  300: '28 8% 65%',
  50: '30 14% 96%',
} as const;

/**
 * Accent hues. Two steps each: `base` for the light theme, `bright` for dark.
 *
 * Every one is deep enough that WHITE label text on it clears 4.5:1, because
 * every filled control in the app carries white ink. `tokens.test.ts` asserts
 * exactly that — a hue lightened past the threshold fails the build, it does
 * not ship a hard-to-read button.
 */
export const accent = {
  orange: { base: '15 92% 43%', bright: '15 92% 44%' },
  sky: { base: '199 100% 33%', bright: '199 95% 35%' },
  violet: { base: '257 72% 52%', bright: '257 74% 58%' },
  emerald: { base: '162 83% 28%', bright: '162 78% 29%' },
  rose: { base: '340 85% 44%', bright: '340 82% 47%' },
  amber: { base: '38 95% 32%', bright: '40 92% 31%' },
  indigo: { base: '235 24% 40%', bright: '235 26% 50%' },
  pink: { base: '326 92% 45%', bright: '326 92% 47%' },
} as const;

/** Status hues. Money-in green, caution amber, neutral-information blue, red. */
export const status = {
  income: { light: '160 65% 30%', dark: '160 65% 31%', barbie: '161 82% 28%' },
  warning: { light: '38 92% 50%', dark: '43 96% 56%', barbie: '40 100% 55%' },
  warningInk: { light: '38 92% 10%', dark: '38 92% 10%', barbie: '34 85% 12%' },
  info: { light: '217 76% 50%', dark: '213 78% 66%', barbie: '198 100% 52%' },
  infoInk: { light: neutral[0], dark: '213 94% 12%', barbie: '205 90% 12%' },
  danger: { light: '0 72% 44%', dark: '0 72% 47%', barbie: '354 90% 46%' },
} as const;

/** Barbie theme's own pinks and mints — it is a themed skin, not a tint. */
export const barbie = {
  canvas: '324 100% 97%',
  ink: '274 38% 13%',
  secondary: '283 100% 95%',
  secondaryInk: '284 56% 28%',
  muted: '318 66% 94%',
  mutedInk: '306 23% 46%',
  mint: '174 100% 90%',
  mintInk: '179 68% 18%',
  rule: '316 66% 88%',
  glass: '324 100% 98%',
  glassDrop: '326 75% 42%',
} as const;
