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
 * A hue in its four jobs. Splitting them is what lets the palette be neon at
 * all — see the note on `accent` below.
 *
 *   solid      the filled surface on the LIGHT canvas.
 *   solidDark  the same fill on the dark canvas, where it can run hotter.
 *   ink        the same hue at a depth that can be READ as text on the canvas.
 *   on         the label that rides on top of the fill.
 */
export type Swatch = {
  /** Filled surfaces, light theme. Capped by the cream canvas. */
  solid: Hsl;
  /** Filled surfaces, dark theme. Full neon — near-black gives it room. */
  solidDark: Hsl;
  /** Text and icons on the light canvas. */
  ink: Hsl;
  /** Text and icons on the dark canvas. */
  inkDark: Hsl;
  /**
   * Label riding on the fill.
   *
   * White wherever white survives — white on saturated colour is the read
   * every drinks can and every finance app trains people on, it is what makes
   * Fanta orange look like Fanta orange, and it is a deliberate product call
   * that a dark label would undo. It is priced honestly: see `accent`.
   *
   * The exception is the yellow-green band. White on `#bbff00` measures
   * 1.2:1 — that is not a relaxed standard, it is an invisible label — so
   * gold, lime and mint carry the app's own near-black instead, which is
   * also what makes those three able to go full neon.
   */
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
 *   `on` on the fill                >= 2.3  (see below — a deliberate bar)
 *   `ink`/`inkDark` on the canvas   >= 4.5  (links, amounts, eyebrow labels)
 *   `solid` on the light canvas     >= 2.0  (a fill that reads as a shape)
 *   `solidDark` on the dark canvas  >= 3.0
 *
 * WHY THE FIRST BAR IS 2.3 AND NOT 4.5. `--primary` is Fanta's own orange,
 * `#ff8300`, and Fanta's own can puts a white wordmark on it. That pairing
 * measures 2.46:1. Holding white to 4.5:1 instead forces any hue down to a
 * relative luminance of about 0.18 — the muddy mid-tone band this palette
 * exists to escape, and the reason the previous orange came out `#e67700`.
 * Button labels here are bold and short, which is what makes it defensible;
 * it is still a real trade and it is made on purpose. Everything read at
 * LENGTH — body copy, links, amounts, muted labels — is a `-ink` token and is
 * still held to the full 4.5:1.
 *
 * WHY `solid` AND `solidDark` DIFFER. The canvas caps the fill, not the label.
 * Cream at 98% lightness leaves a bright hue nowhere to sit, so light mode
 * takes each colour to the brightest value that still reads as a shape on it;
 * near-black leaves all the room in the world, so dark mode runs the same hue
 * at full neon. Dark mode is where this palette is loudest, and that is the
 * correct place for neon to be loudest.
 */
export const accent = {
  /** Fanta US, `#ff8300`, to the hue. The brand, and the default accent. */
  orange: {
    solid: '30.8 100% 50%',
    solidDark: '31 100% 52%',
    ink: '25 100% 33%',
    inkDark: '33 100% 62%',
    on: neutral[0],
  },
  /** Hot coral, the Monzo note — a red that reads as warm rather than alarming. */
  coral: {
    solid: '8 100% 62%',
    solidDark: '8 100% 64%',
    ink: '357 90% 42%',
    inkDark: '8 100% 70%',
    on: neutral[0],
  },
  /** Gold, lime and mint are the yellow-green band: they take the near-black
   *  label, which is exactly what buys them the room to be this bright. */
  amber: {
    solid: '44 100% 43%',
    solidDark: '44 100% 52%',
    ink: '36 100% 29%',
    inkDark: '44 100% 58%',
    on: neutral[900],
  },
  lime: {
    solid: '76 100% 38%',
    solidDark: '76 100% 52%',
    ink: '82 100% 24%',
    inkDark: '76 100% 55%',
    on: neutral[900],
  },
  emerald: {
    solid: '158 100% 38%',
    solidDark: '158 100% 48%',
    ink: '163 100% 25%',
    inkDark: '158 100% 50%',
    on: neutral[900],
  },
  sky: {
    solid: '199 100% 50%',
    solidDark: '199 100% 52%',
    ink: '204 100% 31%',
    inkDark: '199 100% 60%',
    on: neutral[0],
  },
  violet: {
    solid: '262 100% 60%',
    solidDark: '264 100% 64%',
    ink: '262 90% 50%',
    inkDark: '264 100% 78%',
    on: neutral[0],
  },
  indigo: {
    solid: '236 100% 62%',
    solidDark: '236 100% 66%',
    ink: '236 90% 50%',
    inkDark: '236 100% 78%',
    on: neutral[0],
  },
  /** Barbie's own pink. Not in the accent picker — the theme owns it. */
  pink: {
    solid: '330 100% 62%',
    solidDark: '330 100% 64%',
    ink: '333 90% 43%',
    inkDark: '330 100% 74%',
    on: neutral[0],
  },
} as const;

/**
 * Status hues. Money-in green, caution gold, neutral-information blue, red.
 *
 * Same four-role shape as the accents, and for the same reason: `text-income`
 * outnumbers `bg-income` roughly three to one in the app, so the green has to
 * be readable AND fillable, and no single value is both.
 *
 * Income and warning sit in the yellow-green band, so they take the near-black
 * label. In practice almost every solid `bg-income` / `bg-warning` in the app
 * is a progress fill carrying no label at all; the one that does is the
 * offline banner's pill.
 */
export const status = {
  income: {
    solid: '158 100% 38%',
    solidDark: '158 100% 46%',
    ink: '163 100% 24%',
    inkDark: '158 100% 50%',
    on: neutral[900],
  },
  warning: {
    solid: '44 100% 43%',
    solidDark: '44 100% 52%',
    ink: '32 100% 30%',
    inkDark: '42 100% 58%',
    on: neutral[900],
  },
  info: {
    solid: '199 100% 50%',
    solidDark: '199 100% 52%',
    ink: '207 100% 34%',
    inkDark: '199 100% 62%',
    on: neutral[0],
  },
  /** Red has the most headroom of any hue here — white clears 3.4:1 on it
   *  without the fill having to give anything up. */
  danger: {
    solid: '4 100% 58%',
    solidDark: '4 100% 62%',
    ink: '356 85% 45%',
    inkDark: '4 100% 70%',
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
 * Dark carries the most because a glow needs somewhere dark to fall off into,
 * and dark is where the fills run hottest.
 */
export const glow = {
  light: '0.5',
  dark: '0.75',
  barbie: '0.55',
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
  orange: '#ff8300',
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
