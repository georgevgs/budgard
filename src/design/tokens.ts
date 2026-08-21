/**
 * Tier 2 — semantic tokens. THE source of truth for every colour in Budgard.
 *
 * Edit a value here and it reaches all five places it has to land, because
 * they are all derived from this file rather than kept in step by hand:
 *   1. `src/design/tokens.generated.css` — the CSS custom properties
 *   2. the pre-paint theme script inlined into `index.html`
 *   3. the CSP sha256 in `netlify.toml` that allows that script
 *   4. `public/manifest.json`'s theme colour
 *   5. `useAccentColor` at runtime
 * The Vite plugin in `plugins/designTokens.ts` writes 1–4; `tokens.test.ts`
 * fails if any of them has drifted. Never hand-edit the generated CSS.
 *
 * Components never name a primitive and never name a hue — they use Tailwind
 * classes over these tokens (`bg-primary`, `text-income-ink`, `border-border`),
 * so a rethemed app is a rethemed file, not a sweep.
 *
 * ─── The three-role rule ─────────────────────────────────────────────────
 * Every branded colour exists as three tokens, and picking the wrong one is
 * the only way to write an illegible screen:
 *
 *   --x               the FILL. Neon. Goes behind something.   `bg-primary`
 *   --x-foreground    the label riding ON that fill.           `text-primary-foreground`
 *   --x-ink           the same hue, deep enough to BE text     `text-primary-ink`
 *                     directly on the page canvas.
 *
 * `bg-primary` + `text-primary-foreground` are a pair and travel together.
 * `text-primary-ink` stands alone on the canvas. A bare `text-primary` is
 * always a bug — it paints neon on the page background — and `tokens.test.ts`
 * greps for it so it cannot reach main.
 */

import {
  accent,
  barbie,
  ink,
  lift,
  neutral,
  status,
  type Hsl,
  type Swatch,
} from './palette.ts';

export type ThemeName = 'light' | 'dark' | 'barbie';

export type TokenMap = Record<string, string>;

export type ThemeDefinition = {
  name: ThemeName;
  /** Selector the theme's tokens are written under. */
  selector: string;
  tokens: TokenMap;
};

/**
 * Theme-independent tokens. Geometry, not colour — these belong to the app
 * chrome, and everything pinned to an edge of the screen anchors to them so a
 * bar can be resized in one place.
 *
 * `--dock-inset` is the ONLY bottom padding a page should carry; routes adding
 * their own stack the two into dead space at the end of the list.
 */
export const BASE_TOKENS: TokenMap = {
  // The two self-hosted variable faces (see src/design/fonts.css for why
  // these two and not the obvious rounded ones). Declared as tokens so the
  // family names live in one place: index.css reads them, and a swap is a
  // one-line edit here rather than a grep across every component.
  '--font-display': "'Commissioner', ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
  '--font-sans': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  // Anything that pins itself below the sticky header — the Activity feed's
  // day dividers, for one — offsets by this rather than restating the number.
  '--header-height': '4rem',
  '--dock-bottom': 'calc(env(safe-area-inset-bottom) + 0.75rem)',
  '--dock-height': '3.5rem',
  '--dock-clearance': 'calc(var(--dock-bottom) + var(--dock-height))',
  '--dock-action-slot': '4.25rem',
  // Phone-first: 1rem from each edge. Past ~30rem the dock stops stretching
  // and centres instead, so it never spans a tablet window.
  '--dock-max-width': '30rem',
  '--dock-edge': 'max(1rem, calc((100% - var(--dock-max-width)) / 2))',
  '--dock-inset': 'calc(var(--dock-clearance) + 0.5rem)',
  // Barbie's pink, shown on the theme button while some OTHER theme is on —
  // the only spot in the app that needs a theme's colour outside that theme.
  '--barbie-swatch': accent.pink.solid,
};

/**
 * Light — white page, white cards, and a hairline doing the separating.
 *
 * The canvas used to be a warm cream so a card had something to lift off. It
 * no longer is: page and card are the same plain white, and the ONLY thing
 * drawing a panel is `--border` at full `--surface-ring`. That is what makes
 * `--surface-ring: 1` load-bearing here rather than decorative — drop it back
 * and every panel in the app dissolves into the page.
 *
 * The trade is deliberate. A tinted ground is a colour the user did not ask
 * for on every screen; a rule is a colour only where there is an edge.
 */
const light: TokenMap = {
  '--background': neutral[0],
  '--foreground': neutral[900],
  '--card': neutral[0],
  '--card-foreground': neutral[900],
  '--popover': neutral[0],
  '--popover-foreground': neutral[900],
  '--primary': accent.orange.solid,
  '--primary-foreground': accent.orange.on,
  '--primary-ink': accent.orange.ink,
  '--secondary': neutral[50],
  '--secondary-foreground': neutral[700],
  '--muted': neutral[50],
  '--muted-foreground': neutral[500],
  '--accent': neutral[100],
  '--accent-foreground': neutral[800],
  '--destructive': status.danger.solid,
  '--destructive-foreground': status.danger.on,
  '--destructive-ink': status.danger.ink,
  '--border': neutral[200],
  '--input': neutral[200],
  // The focus ring is the ink, never the fill: a ring has to clear 3:1 against
  // the canvas it is drawn on, which is exactly what the ink guarantees.
  '--ring': accent.orange.ink,
  '--income': status.income.solid,
  '--income-foreground': status.income.on,
  '--income-ink': status.income.ink,
  '--warning': status.warning.solid,
  '--warning-foreground': status.warning.on,
  '--warning-ink': status.warning.ink,
  '--info': status.info.solid,
  '--info-foreground': status.info.on,
  '--info-ink': status.info.ink,
  '--radius': '1rem',
  // Full strength: on a white page over white cards the rule is the only
  // separation there is. This is not a decorative hairline.
  '--surface-ring': '1',
  // Alpha on the neutral drop shadow under a raised control. See `.lift` in
  // index.css — grey, never the accent.
  '--lift-strength': lift.light,
  // Highlight sweeping across skeleton placeholders — light catching the
  // surface. White in every theme, far more transparent on dark where the
  // muted block already sits close to black.
  '--skeleton-sheen': '0 0% 100% / 0.75',
  // Liquid glass. WebKit cannot refract (SVG filters are barred from
  // backdrop-filter), so the read is built from translucency, a lit rim and
  // real elevation. Tuned per theme.
  '--glass-bg': neutral[0],
  // Denser than it was, and with the lit rim and sheen switched off: both were
  // white-on-white here, painting nothing while still costing a layer. The
  // capsule's edge is the `--border` hairline in `.glass-capsule`, same as
  // every other panel, and its shadow is plain black rather than warm brown.
  '--glass-alpha': '0.8',
  '--glass-sheen': '0',
  '--glass-rim': '0 0% 100% / 0',
  '--glass-drop': '0 0% 0% / 0.1',
};

/** Dark — the light theme read from the other end. Page and card are again the
 *  same tone with a rule between them, and the blacks carry no tint. The neon
 *  has somewhere to fall off into here, so every fill runs a step brighter
 *  than it can on the light canvas. */
const dark: TokenMap = {
  '--background': ink[950],
  '--foreground': ink[50],
  '--card': ink[950],
  '--card-foreground': ink[50],
  '--popover': ink[950],
  '--popover-foreground': ink[50],
  '--primary': accent.orange.solidDark,
  '--primary-foreground': accent.orange.on,
  '--primary-ink': accent.orange.inkDark,
  '--secondary': ink[800],
  '--secondary-foreground': ink[50],
  '--muted': ink[800],
  '--muted-foreground': ink[300],
  '--accent': ink[700],
  '--accent-foreground': ink[50],
  '--destructive': status.danger.solidDark,
  '--destructive-foreground': status.danger.on,
  '--destructive-ink': status.danger.inkDark,
  '--border': ink[600],
  '--input': ink[600],
  '--ring': accent.orange.inkDark,
  '--income': status.income.solidDark,
  '--income-foreground': status.income.on,
  '--income-ink': status.income.inkDark,
  '--warning': status.warning.solidDark,
  '--warning-foreground': status.warning.on,
  '--warning-ink': status.warning.inkDark,
  '--info': status.info.solidDark,
  '--info-foreground': status.info.on,
  '--info-ink': status.info.inkDark,
  '--surface-ring': '1',
  '--lift-strength': lift.dark,
  '--skeleton-sheen': '0 0% 100% / 0.07',
  // The one surface allowed to sit above the page tone: the dock capsule has
  // content sliding under it, so it needs a ground of its own.
  '--glass-bg': ink[900],
  '--glass-alpha': '0.78',
  '--glass-sheen': '0.06',
  '--glass-rim': '0 0% 100% / 0.1',
  '--glass-drop': '0 0% 0% / 0.5',
};

/** Barbie — a full skin with its own fixed palette; the accent picker hides. */
const barbieTheme: TokenMap = {
  '--background': barbie.canvas,
  '--foreground': barbie.ink,
  '--card': neutral[0],
  '--card-foreground': barbie.ink,
  '--popover': neutral[0],
  '--popover-foreground': barbie.ink,
  '--primary': accent.pink.solid,
  '--primary-foreground': accent.pink.on,
  '--primary-ink': accent.pink.ink,
  '--secondary': barbie.secondary,
  '--secondary-foreground': barbie.secondaryInk,
  '--muted': barbie.muted,
  '--muted-foreground': barbie.mutedInk,
  '--accent': barbie.mint,
  '--accent-foreground': barbie.mintInk,
  '--destructive': status.danger.solid,
  '--destructive-foreground': status.danger.on,
  '--destructive-ink': status.danger.ink,
  '--border': barbie.rule,
  '--input': barbie.rule,
  '--ring': accent.pink.ink,
  '--income': status.income.solid,
  '--income-foreground': status.income.on,
  '--income-ink': status.income.ink,
  '--warning': status.warning.solid,
  '--warning-foreground': status.warning.on,
  '--warning-ink': status.warning.ink,
  '--info': status.info.solid,
  '--info-foreground': status.info.on,
  '--info-ink': status.info.ink,
  '--radius': '1.25rem',
  '--surface-ring': '0.45',
  '--lift-strength': lift.barbie,
  '--glass-bg': barbie.glass,
  '--glass-alpha': '0.7',
  '--glass-sheen': '0.46',
  '--glass-rim': '0 0% 100% / 0.8',
  '--glass-drop': `${barbie.glassDrop} / 0.25`,
};

/**
 * Light first: it carries every token, and the other two override only what
 * they change. A token added to light but forgotten in dark therefore
 * inherits rather than resolving to nothing.
 */
export const THEMES: ThemeDefinition[] = [
  { name: 'light', selector: ':root', tokens: light },
  { name: 'dark', selector: '.dark', tokens: dark },
  { name: 'barbie', selector: "[data-theme='barbie']", tokens: barbieTheme },
];

export type AccentColorKey =
  | 'sunset'
  | 'coral'
  | 'gold'
  | 'lime'
  | 'mint'
  | 'ocean'
  | 'lavender'
  | 'electric';

export type AccentColor = {
  key: AccentColorKey;
  swatch: Swatch;
};

/**
 * User-selectable accents, ordered around the colour wheel so the picker grid
 * reads as a spectrum rather than a bag of colours.
 *
 * Keys are stored in localStorage, so they outlive any renaming of the hue
 * behind them — `sunset` has been the default since before it was Fanta.
 */
export const ACCENTS: AccentColor[] = [
  { key: 'sunset', swatch: accent.orange },
  { key: 'coral', swatch: accent.coral },
  { key: 'gold', swatch: accent.amber },
  { key: 'lime', swatch: accent.lime },
  { key: 'mint', swatch: accent.emerald },
  { key: 'ocean', swatch: accent.sky },
  { key: 'lavender', swatch: accent.violet },
  { key: 'electric', swatch: accent.indigo },
];

export const DEFAULT_ACCENT: AccentColorKey = 'sunset';

/** Properties the accent owns — the full set to set, and to clear for barbie. */
export const ACCENT_PROPERTIES = [
  '--primary',
  '--primary-foreground',
  '--primary-ink',
  '--ring',
] as const;

/**
 * The four values `applyAccentToDocument` and the pre-paint script write, in
 * the order `ACCENT_PROPERTIES` lists them. Kept here so the runtime hook and
 * the inlined script cannot disagree about what an accent means.
 */
export const accentValues = (
  swatch: Swatch,
  isDark: boolean,
): [Hsl, Hsl, Hsl, Hsl] => {
  if (isDark) {
    return [swatch.solidDark, swatch.on, swatch.inkDark, swatch.inkDark];
  }

  return [swatch.solid, swatch.on, swatch.ink, swatch.ink];
};
