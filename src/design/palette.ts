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
 * lets `bg-primary/10` work at all. The exception is `dataColors`, which is
 * hex because those values are written to the database.
 */

export type Hsl = string;

/**
 * A hue in its three jobs. Splitting them is what lets the palette be neon at
 * all — see the note on `accent` below.
 *
 *   solid  the filled surface (button, FAB, progress bar). Carries `on`.
 *   ink    the same hue at a depth that can be READ as text on the canvas.
 *   on     the label that rides on top of `solid`.
 */
export type Swatch = {
  /** Filled surfaces, light theme. */
  solid: Hsl;
  /** Filled surfaces, dark theme. */
  solidDark: Hsl;
  /** Text and icons on the light canvas. */
  ink: Hsl;
  /** Text and icons on the dark canvas. */
  inkDark: Hsl;
  /** Label riding on `solid`. White across the board — a deliberate product
   *  call: white on saturated colour is the read every finance app trains
   *  people on (Fanta's own wordmark, Monzo's coral, Revolut's blue), and it
   *  looks right in a way a dark label on neon does not. The cost is real and
   *  is paid in `solid` below, not hidden. Kept per-swatch rather than as one
   *  global constant so a future hue can take a dark label without replumbing
   *  every consumer. */
  on: Hsl;
};

/** Warm greys — the light theme's canvas, surfaces and rules. */
export const neutral = {
  0: '0 0% 100%',
  25: '32 100% 98%',
  50: '30 60% 96%',
  100: '30 45% 93%',
  200: '28 35% 87%',
  500: '25 12% 40%',
  700: '24 14% 14%',
  800: '24 16% 11%',
  900: '24 18% 9%',
} as const;

/** Warm-tinted darks — the dark theme's canvas and surfaces. */
export const ink = {
  950: '26 32% 5%',
  900: '25 24% 9%',
  800: '24 18% 14%',
  700: '24 16% 18%',
  500: '25 14% 36%',
  300: '28 22% 72%',
  50: '30 45% 96%',
} as const;

/**
 * Accent hues, each at the most saturated value its role allows.
 *
 * Every value here is pinned by a test in `tokens.test.ts`, which is worth
 * knowing before nudging one:
 *
 *   `on` on `solid`/`solidDark`     >= 3.0  (see below — a deliberate bar)
 *   `ink`/`inkDark` on the canvas   >= 4.5  (links and eyebrow labels)
 *   `solid` on the light canvas     >= 2.2  (a fill that reads as a shape)
 *   `solidDark` on the dark canvas  >= 3.0
 *
 * WHY THE FIRST BAR IS 3.0 AND NOT 4.5. Every fill carries a white label, by
 * product decision — white on saturated colour is what a finance app is
 * expected to look like, and it reads better to most people than a dark label
 * on neon does. White at 4.5:1 forces a hue down to a relative luminance of
 * about 0.18, which is the muddy mid-tone band this palette exists to escape,
 * so the bar is AA-large instead. Button labels are bold, which is what makes
 * that defensible; it is still a real trade and it is made on purpose.
 *
 * That white label is also why `solid` and `solidDark` are equal for most
 * hues. Once white is the constraint, a fill cannot get brighter in dark mode
 * — so the neon lives everywhere else instead: in `inkDark` (full-strength
 * hue as text on near-black), in the alpha tints, and in the coloured glow.
 * Only violet, indigo and red are dark enough to have room to move.
 */
export const accent = {
  /** Fanta. The brand, and the default accent. */
  orange: {
    solid: '31 100% 45%',
    solidDark: '31 100% 45%',
    ink: '27 100% 34%',
    inkDark: '33 100% 60%',
    on: neutral[0],
  },
  /** Hot coral, the Monzo note — a red that reads as warm rather than alarming. */
  coral: {
    solid: '4 100% 66%',
    solidDark: '4 100% 66%',
    ink: '357 85% 43%',
    inkDark: '6 100% 68%',
    on: neutral[0],
  },
  amber: {
    solid: '41 100% 39%',
    solidDark: '41 100% 39%',
    ink: '35 100% 30%',
    inkDark: '44 100% 56%',
    on: neutral[0],
  },
  lime: {
    solid: '74 92% 32.5%',
    solidDark: '74 92% 32.5%',
    ink: '82 95% 25%',
    inkDark: '78 92% 55%',
    on: neutral[0],
  },
  emerald: {
    solid: '156 100% 33%',
    solidDark: '156 100% 33%',
    ink: '162 100% 26%',
    inkDark: '156 95% 52%',
    on: neutral[0],
  },
  sky: {
    solid: '197 100% 43%',
    solidDark: '197 100% 43%',
    ink: '203 100% 32%',
    inkDark: '197 100% 58%',
    on: neutral[0],
  },
  /** Violet and indigo are dark enough that white sits on them comfortably,
   *  so these two are the only accents that still brighten for dark mode. */
  violet: {
    solid: '266 95% 58%',
    solidDark: '268 100% 62%',
    ink: '264 90% 50%',
    inkDark: '268 100% 76%',
    on: neutral[0],
  },
  indigo: {
    solid: '232 95% 58%',
    solidDark: '234 100% 65%',
    ink: '233 90% 48%',
    inkDark: '234 100% 76%',
    on: neutral[0],
  },
  /** Barbie's own pink. Not in the accent picker — the theme owns it. */
  pink: {
    solid: '330 100% 65%',
    solidDark: '330 100% 65%',
    ink: '332 90% 44%',
    inkDark: '330 100% 74%',
    on: neutral[0],
  },
} as const;

/**
 * Status hues. Money-in green, caution amber, neutral-information blue, red.
 *
 * Same three-role shape as the accents, and for the same reason: `text-income`
 * outnumbers `bg-income` roughly three to one in the app, so the green has to
 * be readable AND fillable, and no single value is both.
 */
export const status = {
  income: {
    solid: '152 95% 34%',
    solidDark: '152 95% 34%',
    ink: '160 100% 24%',
    inkDark: '152 95% 52%',
    on: neutral[0],
  },
  warning: {
    solid: '38 100% 40%',
    solidDark: '38 100% 40%',
    ink: '32 100% 30%',
    inkDark: '41 100% 57%',
    on: neutral[0],
  },
  info: {
    solid: '203 100% 48%',
    solidDark: '203 100% 48%',
    ink: '208 100% 34%',
    inkDark: '203 100% 62%',
    on: neutral[0],
  },
  /** Red has the most headroom of any hue here — white clears 5:1 on it
   *  without the fill having to give anything up. */
  danger: {
    solid: '356 85% 47%',
    solidDark: '356 88% 46%',
    ink: '356 82% 45%',
    inkDark: '356 100% 68%',
    on: neutral[0],
  },
} as const;

/** Barbie's own bubblegum canvas — it is a themed skin, not a tint. */
export const barbie = {
  canvas: '326 100% 97%',
  ink: '288 60% 12%',
  secondary: '286 100% 94%',
  secondaryInk: '284 70% 30%',
  muted: '320 80% 93%',
  mutedInk: '308 32% 40%',
  mint: '172 100% 88%',
  mintInk: '178 90% 16%',
  rule: '318 80% 86%',
  glass: '326 100% 98%',
  glassDrop: '328 85% 45%',
} as const;

/**
 * How hard the neon bleeds. Multiplied into the coloured drop shadow behind
 * the FAB, the nav indicator and the hero — the part that makes a bright hue
 * read as LIT rather than merely bright.
 *
 * Dark carries more because a glow needs somewhere dark to fall off into.
 */
export const glow = {
  light: '0.4',
  dark: '0.6',
  barbie: '0.45',
} as const;

/**
 * Swatches offered when the USER picks a colour — categories, tags, goals,
 * debts and accounts. Hex rather than HSL because these are written to the
 * database and read back by anything that renders a dot.
 *
 * Kept here, with the rest of the palette, because five separate copies of
 * this list had drifted apart across the app: the category picker offered
 * colours the tag picker never cycled, the onboarding presets used a sixth
 * set, and the confetti fired in a seventh that matched none of them.
 *
 * Named rather than a bare array so a form's default swatch can be a
 * reference (`swatch.violet`) instead of yet another loose hex literal.
 */
export const swatch = {
  red: '#ff3b30',
  flame: '#ff6b35',
  /** The brand, as a data colour. */
  orange: '#ff8400',
  amber: '#ffa300',
  gold: '#ffc700',
  citron: '#ffe600',
  lime: '#c8f000',
  spring: '#8de000',
  green: '#3ddb4f',
  mint: '#00d97e',
  aqua: '#00debb',
  cyan: '#00d5f0',
  sky: '#00b0ff',
  azure: '#3d8bff',
  indigo: '#4d5eff',
  violet: '#7c4dff',
  purple: '#a855f7',
  magenta: '#d946ef',
  pink: '#ff3da6',
  rose: '#ff5c8a',
  peach: '#ff8e5e',
  teal: '#00a896',
  steel: '#8892b0',
  slate: '#39415c',
} as const;

/** The picker grid, ordered by hue so it reads as a spectrum. */
export const dataColors = Object.values(swatch);

/** Income categories start from the money-in end of the ramp. */
export const incomeColors = [
  swatch.mint,
  swatch.green,
  swatch.spring,
  swatch.aqua,
  swatch.cyan,
  swatch.teal,
] as const;

/** Fired on a reached goal or a cleared debt — the brightest of the ramp. */
export const celebrationColors = [
  swatch.orange,
  swatch.pink,
  swatch.mint,
  swatch.sky,
  swatch.violet,
  swatch.citron,
] as const;
