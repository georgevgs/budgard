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
 * classes over these tokens (`bg-primary`, `text-income`, `border-border`),
 * so a rethemed app is a rethemed file, not a sweep.
 */

import { accent, barbie, ink, neutral, status, type Hsl } from './palette.ts';

export type ThemeName = 'light' | 'dark' | 'barbie';

export type TokenMap = Record<string, string>;

export type ThemeDefinition = {
  name: ThemeName;
  /** Selector the theme's tokens are written under. */
  selector: string;
  tokens: TokenMap;
};

/** Ink carried by every filled control, in every theme. See palette.accent. */
const ON_ACCENT: Hsl = neutral[0];

/**
 * Theme-independent tokens. Geometry, not colour — these belong to the
 * floating dock, and everything pinned to the bottom of the screen anchors to
 * them so the bar can be resized in one place.
 *
 * `--dock-inset` is the ONLY bottom padding a page should carry; routes adding
 * their own stack the two into dead space at the end of the list.
 */
export const BASE_TOKENS: TokenMap = {
  '--dock-bottom': 'calc(env(safe-area-inset-bottom) + 0.75rem)',
  '--dock-height': '3.5rem',
  '--dock-clearance': 'calc(var(--dock-bottom) + var(--dock-height))',
  '--dock-action-slot': '4.25rem',
  // Phone-first: 1rem from each edge. Past ~30rem the dock stops stretching
  // and centres instead, so it never spans a tablet window.
  '--dock-max-width': '30rem',
  '--dock-edge': 'max(1rem, calc((100% - var(--dock-max-width)) / 2))',
  '--dock-inset': 'calc(var(--dock-clearance) + 0.5rem)',
};

/**
 * Light — a plain white canvas with neutral greys. The brand lives in the
 * accent, not in the page, so colour only ever means something.
 *
 * Card and canvas are the same white, which is why `--surface-ring` has to be
 * near-opaque here: the hairline rim is the only thing separating a panel from
 * the page. On the tinted themes the fill already does that work.
 */
const light: TokenMap = {
  '--background': neutral[0],
  '--foreground': neutral[900],
  '--card': neutral[0],
  '--card-foreground': neutral[900],
  '--popover': neutral[0],
  '--popover-foreground': neutral[900],
  '--primary': accent.orange.base,
  '--primary-foreground': ON_ACCENT,
  '--secondary': neutral[50],
  '--secondary-foreground': neutral[700],
  '--muted': neutral[50],
  '--muted-foreground': neutral[500],
  '--accent': neutral[100],
  '--accent-foreground': neutral[800],
  '--destructive': status.danger.light,
  '--destructive-foreground': ON_ACCENT,
  '--border': neutral[200],
  '--input': neutral[200],
  '--ring': accent.orange.base,
  '--income': status.income.light,
  '--income-foreground': ON_ACCENT,
  '--warning': status.warning.light,
  // Warning and info ink stay dark: both are used as text ON A TINT
  // (`bg-warning/14 text-warning-foreground`), never on the solid colour,
  // so white here would disappear rather than read.
  '--warning-foreground': status.warningInk.light,
  '--info': status.info.light,
  '--info-foreground': status.infoInk.light,
  '--radius': '0.875rem',
  '--surface-ring': '0.85',
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
  '--glass-drop': '0 0% 0% / 0.16',
};

/** Dark — warm-tinted blacks, so the orange never looks stuck on cold grey. */
const dark: TokenMap = {
  '--background': ink[950],
  '--foreground': ink[50],
  '--card': ink[900],
  '--card-foreground': ink[50],
  '--popover': ink[900],
  '--popover-foreground': ink[50],
  '--primary': accent.orange.bright,
  '--primary-foreground': ON_ACCENT,
  '--secondary': ink[800],
  '--secondary-foreground': ink[50],
  '--muted': ink[800],
  '--muted-foreground': ink[300],
  '--accent': ink[700],
  '--accent-foreground': ink[50],
  '--destructive': status.danger.dark,
  '--destructive-foreground': '0 0% 98%',
  '--border': ink[500],
  '--input': ink[500],
  '--ring': accent.orange.bright,
  '--income': status.income.dark,
  '--income-foreground': ON_ACCENT,
  '--warning': status.warning.dark,
  '--warning-foreground': status.warningInk.dark,
  '--info': status.info.dark,
  '--info-foreground': status.infoInk.dark,
  '--surface-ring': '0.3',
  '--skeleton-sheen': '0 0% 100% / 0.07',
  '--glass-bg': '0 0% 11%',
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
  '--primary': accent.pink.base,
  '--primary-foreground': ON_ACCENT,
  '--secondary': barbie.secondary,
  '--secondary-foreground': barbie.secondaryInk,
  '--muted': barbie.muted,
  '--muted-foreground': barbie.mutedInk,
  '--accent': barbie.mint,
  '--accent-foreground': barbie.mintInk,
  '--destructive': status.danger.barbie,
  '--destructive-foreground': ON_ACCENT,
  '--border': barbie.rule,
  '--input': barbie.rule,
  '--ring': accent.pink.base,
  '--income': status.income.barbie,
  '--income-foreground': ON_ACCENT,
  '--warning': status.warning.barbie,
  '--warning-foreground': status.warningInk.barbie,
  '--info': status.info.barbie,
  '--info-foreground': status.infoInk.barbie,
  '--radius': '1.125rem',
  '--surface-ring': '0.45',
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
  | 'ocean'
  | 'lavender'
  | 'mint'
  | 'coral'
  | 'gold'
  | 'slate';

export type AccentColor = {
  key: AccentColorKey;
  /** Written to --primary/--ring on the light and dark themes respectively. */
  light: Hsl;
  dark: Hsl;
};

/**
 * User-selectable accents. Each replaces --primary and --ring only; the label
 * ink is always white, so a hue that cannot carry white is not a valid accent.
 */
export const ACCENTS: AccentColor[] = [
  { key: 'sunset', light: accent.orange.base, dark: accent.orange.bright },
  { key: 'ocean', light: accent.sky.base, dark: accent.sky.bright },
  { key: 'lavender', light: accent.violet.base, dark: accent.violet.bright },
  { key: 'mint', light: accent.emerald.base, dark: accent.emerald.bright },
  { key: 'coral', light: accent.rose.base, dark: accent.rose.bright },
  { key: 'gold', light: accent.amber.base, dark: accent.amber.bright },
  { key: 'slate', light: accent.indigo.base, dark: accent.indigo.bright },
];

export const DEFAULT_ACCENT: AccentColorKey = 'sunset';

/** The one ink value every accent, in every theme, puts on top of itself. */
export const ACCENT_FOREGROUND: Hsl = ON_ACCENT;

/** Properties the accent owns — the full set to set, and to clear for barbie. */
export const ACCENT_PROPERTIES = [
  '--primary',
  '--primary-foreground',
  '--ring',
] as const;
