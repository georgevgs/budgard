import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { AA_LARGE, AA_TEXT, contrastRatio } from './contrast';
import {
  buildManifestColors,
  buildThemeInitScript,
  buildTokensCss,
  hslToHex,
} from './generate';
import { ACCENTS, ACCENT_FOREGROUND, THEMES, type ThemeName } from './tokens';

const ROOT = path.resolve(__dirname, '../..');

const read = (file: string): string =>
  readFileSync(path.join(ROOT, file), 'utf8');

const tokensFor = (name: ThemeName): Record<string, string> => {
  const theme = THEMES.find((entry) => entry.name === name);

  if (!theme) {
    throw new Error(`No such theme: ${name}`);
  }

  return theme.tokens;
};

// The light theme carries every token; dark and barbie override a subset, so
// resolving a token means falling back to light exactly as the cascade does.
const resolve = (name: ThemeName, token: string): string => {
  const value = tokensFor(name)[token] ?? tokensFor('light')[token];

  if (!value) {
    throw new Error(`No such token: ${token}`);
  }

  return value;
};

describe('generated artefacts', () => {
  // These four are the reason the token module exists: each is a copy of the
  // palette living outside the module graph. If one drifts, the app ships a
  // colour nobody chose — or, for the CSP hash, a blank first paint.
  it('tokens.generated.css is what the tokens currently produce', () => {
    expect(read('src/design/tokens.generated.css')).toBe(buildTokensCss());
  });

  it('the netlify CSP allows the exact pre-paint script that gets inlined', () => {
    const hash = createHash('sha256')
      .update(buildThemeInitScript())
      .digest('base64');

    expect(read('netlify.toml')).toContain(`'sha256-${hash}'`);
  });

  it('index.html still has the placeholder the script is injected into', () => {
    expect(read('index.html')).toContain('<!--THEME_INIT-->');
  });

  it('the manifest carries the light theme colours', () => {
    const manifest = JSON.parse(read('public/manifest.json')) as Record<
      string,
      string
    >;
    const colors = buildManifestColors();

    expect(manifest.theme_color).toBe(colors.theme_color);
    expect(manifest.background_color).toBe(colors.background_color);
  });

  it('converts HSL to the hex the manifest needs', () => {
    expect(hslToHex('0 0% 100%')).toBe('#ffffff');
    expect(hslToHex('0 0% 0%')).toBe('#000000');
    expect(hslToHex('15 92% 44%')).toBe('#d73d09');
  });
});

describe('contrast', () => {
  const themes: ThemeName[] = ['light', 'dark', 'barbie'];

  // Every filled control in the app puts its foreground token on its colour
  // token. Body-sized labels sit on all of them, so AA text is the bar.
  const filled = [
    ['--primary', '--primary-foreground'],
    ['--destructive', '--destructive-foreground'],
    ['--income', '--income-foreground'],
  ] as const;

  it.each(themes)('%s: filled controls carry legible labels', (theme) => {
    for (const [surface, foreground] of filled) {
      const ratio = contrastRatio(resolve(theme, foreground), resolve(theme, surface));

      expect(
        ratio,
        `${foreground} on ${surface} in ${theme} is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  // The accent picker rewrites --primary only; the ink stays white. A hue
  // light enough to lose that ink is not a valid accent, however pretty.
  it.each(ACCENTS)('$key carries white ink in both themes', (accent) => {
    for (const color of [accent.light, accent.dark]) {
      const ratio = contrastRatio(ACCENT_FOREGROUND, color);

      expect(
        ratio,
        `white on ${color} is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  // ...and dark enough to lose the canvas is no good either: --primary is also
  // drawn AS colour (nav indicator, FAB, hero tint) on both backgrounds.
  it.each(ACCENTS)('$key still reads against both canvases', (accent) => {
    const onLight = contrastRatio(accent.light, resolve('light', '--background'));
    const onDark = contrastRatio(accent.dark, resolve('dark', '--background'));

    expect(onLight).toBeGreaterThanOrEqual(AA_LARGE);
    expect(onDark).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it.each(themes)('%s: body text clears AA against the canvas', (theme) => {
    const ratio = contrastRatio(
      resolve(theme, '--foreground'),
      resolve(theme, '--background'),
    );

    expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(themes)('%s: muted text clears AA against the canvas', (theme) => {
    const ratio = contrastRatio(
      resolve(theme, '--muted-foreground'),
      resolve(theme, '--background'),
    );

    expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
