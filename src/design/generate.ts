/**
 * Turns the tokens into the artefacts the app actually ships. Every function
 * here is pure and takes no arguments, so the Vite plugin that writes the
 * files and the test that verifies them run the exact same code — which is
 * what makes "generated" mean something.
 */

import {
  ACCENTS,
  ACCENT_FOREGROUND,
  BASE_TOKENS,
  THEMES,
  type TokenMap,
} from './tokens.ts';

const GENERATED_HEADER = [
  '/*',
  ' * GENERATED FILE — DO NOT EDIT.',
  ' *',
  ' * Written from src/design/tokens.ts by plugins/designTokens.ts on every',
  ' * dev start and build. Edit the tokens; run the build; commit both.',
  ' */',
].join('\n');

const formatBlock = (selector: string, tokens: TokenMap): string => {
  const declarations = Object.entries(tokens)
    .map(([name, value]) => `    ${name}: ${value};`)
    .join('\n');

  return `  ${selector} {\n${declarations}\n  }`;
};

/** The `@layer base` block of custom properties, one selector per theme. */
export const buildTokensCss = (): string => {
  const blocks = THEMES.map((theme) => {
    if (theme.selector === ':root') {
      return formatBlock(theme.selector, { ...BASE_TOKENS, ...theme.tokens });
    }

    return formatBlock(theme.selector, theme.tokens);
  });

  return `${GENERATED_HEADER}\n\n@layer base {\n${blocks.join('\n\n')}\n}\n`;
};

/**
 * The pre-paint theme script, inlined into index.html so the saved theme and
 * accent are on the element before the first frame — a stylesheet cannot do
 * this, and without it every dark-mode load flashes white.
 *
 * Inlined rather than served as a file because a render-blocking request here
 * would cost more than the script weighs. That is also why its sha256 has to
 * be allow-listed in the CSP; the plugin keeps netlify.toml in step.
 */
export const buildThemeInitScript = (): string => {
  const accents = ACCENTS.map(
    (item) => `    ${item.key}: ['${item.light}', '${item.dark}']`,
  ).join(',\n');

  return `(function () {
  var root = document.documentElement;
  var savedTheme = 'light';
  var savedAccent = null;

  try {
    savedTheme = localStorage.getItem('theme') || 'light';
    savedAccent = localStorage.getItem('accent-color');
  } catch (error) {
    // Storage can be unavailable (private mode) — fall back to the defaults.
  }

  root.setAttribute('data-theme', savedTheme);

  if (savedTheme === 'dark') {
    root.classList.add('dark');
  }

  // Barbie has its own fixed palette — never override its primary.
  if (savedTheme === 'barbie') return;

  var accents = {
${accents}
  };

  var accent = savedAccent && accents[savedAccent];
  if (!accent) return;

  var color = savedTheme === 'dark' ? accent[1] : accent[0];
  root.style.setProperty('--primary', color);
  root.style.setProperty('--primary-foreground', '${ACCENT_FOREGROUND}');
  root.style.setProperty('--ring', color);
})();`;
};

/** Converts a bare "H S% L%" triple to the hex the manifest has to carry. */
export const hslToHex = (value: string): string => {
  const [hue, saturation, lightness] = value
    .split(' ')
    .map((part) => Number.parseFloat(part));

  const chroma = (saturation / 100) * Math.min(lightness / 100, 1 - lightness / 100);

  const channel = (offset: number): string => {
    const position = (offset + hue / 30) % 12;
    const amount =
      lightness / 100 - chroma * Math.max(-1, Math.min(position - 3, 9 - position, 1));

    return Math.round(amount * 255)
      .toString(16)
      .padStart(2, '0');
  };

  return `#${channel(0)}${channel(8)}${channel(4)}`;
};

const lightTokens = (): TokenMap => {
  const light = THEMES.find((theme) => theme.name === 'light');

  if (!light) {
    throw new Error('The light theme is the base every other theme overrides');
  }

  return light.tokens;
};

/** Browser chrome and PWA splash colours, both derived from the light theme. */
export const buildManifestColors = (): {
  theme_color: string;
  background_color: string;
} => ({
  theme_color: hslToHex(lightTokens()['--background']),
  background_color: hslToHex(lightTokens()['--primary']),
});
