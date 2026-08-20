/**
 * Turns the tokens into the artefacts the app actually ships. Every function
 * here is pure and takes no arguments, so the Vite plugin that writes the
 * files and the test that verifies them run the exact same code — which is
 * what makes "generated" mean something.
 */

import {
  ACCENTS,
  ACCENT_PROPERTIES,
  BASE_TOKENS,
  THEMES,
  accentValues,
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

/** A tuple of HSL triples as the JS array literal the init script embeds. */
const quote = (values: readonly string[]): string =>
  `[${values.map((value) => `'${value}'`).join(', ')}]`;

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
  // Each accent ships as the exact tuple of values the four ACCENT_PROPERTIES
  // take, light first then dark, so the script does no colour reasoning of its
  // own — it indexes a table this module built.
  const accents = ACCENTS.map((item) => {
    const light = accentValues(item.swatch, false);
    const dark = accentValues(item.swatch, true);

    return `    ${item.key}: [${quote(light)}, ${quote(dark)}]`;
  }).join(',\n');

  const properties = ACCENT_PROPERTIES.map((name) => `'${name}'`).join(', ');

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

  var properties = [${properties}];
  var accents = {
${accents}
  };

  var accent = savedAccent && accents[savedAccent];
  if (!accent) return;

  var values = savedTheme === 'dark' ? accent[1] : accent[0];

  for (var i = 0; i < properties.length; i++) {
    root.style.setProperty(properties[i], values[i]);
  }
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
