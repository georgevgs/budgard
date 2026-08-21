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
  glow,
  ink,
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
 * Light — a warm cream canvas with white cards floating on it.
 *
 * The canvas is tinted rather than white so the app reads warm the moment it
 * opens, and so a card has something to lift off. That also lets
 * `--surface-ring` sit much lower than it used to: the panel is now separated
 * by its fill, not by a hairline doing all the work alone.
 */
const light: TokenMap = {
  '--background': neutral[25],
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
  '--surface-ring': '0.5',
  // How hard a neon fill bleeds into the page. See `.glow-*` in index.css.
  '--glow-strength': glow.light,
  // Alpha on the brand stop of the `.aurora` wash — the coloured light the
  // landing page and the app's hero sections sit in. The other stops are
  // secondary hues and are fixed; this is the one that carries the accent, so
  // it is the one that has to answer to the canvas underneath it.
  '--aurora': '0.38',
  // Highlight sweeping across skeleton placeholders — light catching the
  // surface. White in every theme, far more transparent on dark where the
  // muted block already sits close to black.
  '--skeleton-sheen': '0 0% 100% / 0.75',
  // Liquid glass. WebKit cannot refract (SVG filters are barred from
  // backdrop-filter), so the read is built from translucency, a lit rim and
  // real elevation. Tuned per theme.
  '--glass-bg': neutral[0],
  '--glass-alpha': '0.62',
  '--glass-sheen': '0.35',
  '--glass-rim': '0 0% 100% / 0.7',
  '--glass-drop': '24 60% 12% / 0.16',
};

/** Dark — warm-tinted blacks. The neon has somewhere to fall off into here,
 *  so every fill runs a step brighter than it can on the light canvas. */
const dark: TokenMap = {
  '--background': ink[950],
  '--foreground': ink[50],
  '--card': ink[900],
  '--card-foreground': ink[50],
  '--popover': ink[900],
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
  '--border': ink[700],
  '--input': ink[700],
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
  '--surface-ring': '0.4',
  '--glow-strength': glow.dark,
  // Near-black gives a wash somewhere to fall off into, so dark carries the
  // most colour of the three themes. This is where the palette is loudest.
  '--aurora': '0.5',
  '--skeleton-sheen': '0 0% 100% / 0.07',
  '--glass-bg': '26 24% 10%',
  '--glass-alpha': '0.72',
  '--glass-sheen': '0.08',
  '--glass-rim': '0 0% 100% / 0.12',
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
  '--glow-strength': glow.barbie,
  '--aurora': '0.34',
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
