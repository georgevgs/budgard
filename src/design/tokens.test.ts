import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { AA_LARGE, AA_TEXT, contrastRatio } from './contrast';
import {
  buildManifestColors,
  buildThemeInitScript,
  buildTokensCss,
  hslToHex,
} from './generate';
import { accent, dataColors, status, type Swatch } from './palette';
import { ACCENTS, THEMES, accentValues, type ThemeName } from './tokens';

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
  // token. That label is white everywhere, by product decision, so the bar is
  // AA_LARGE rather than AA_TEXT — see the long note in palette.ts on why, and
  // what it costs. Labels on these controls are bold, which is what keeps it
  // defensible. Lowering this further is not a colour tweak, it is reopening
  // that decision.
  const filled = [
    ['--primary', '--primary-foreground'],
    ['--destructive', '--destructive-foreground'],
    ['--income', '--income-foreground'],
    ['--warning', '--warning-foreground'],
    ['--info', '--info-foreground'],
  ] as const;

  it.each(themes)('%s: filled controls carry legible labels', (theme) => {
    for (const [surface, foreground] of filled) {
      const ratio = contrastRatio(resolve(theme, foreground), resolve(theme, surface));

      expect(
        ratio,
        `${foreground} on ${surface} in ${theme} is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  // The other half of the three-role rule. Every `-ink` token is drawn AS text
  // straight onto the canvas — links, eyebrow labels, the amount on an income
  // row — so it answers to the body-text bar, not the large-text one. This is
  // the test that lets the fills be neon: the fill no longer has to be
  // readable, because the ink is.
  const inks = [
    '--primary-ink',
    '--destructive-ink',
    '--income-ink',
    '--warning-ink',
    '--info-ink',
  ] as const;

  it.each(themes)('%s: ink tokens can be read on the canvas', (theme) => {
    for (const token of inks) {
      const ratio = contrastRatio(
        resolve(theme, token),
        resolve(theme, '--background'),
      );

      expect(
        ratio,
        `${token} on the ${theme} canvas is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  // A fill still has to read as a shape. Neon on a pale canvas cannot reach
  // 3:1 — that is the physics that forced the ink split in the first place —
  // but below about 2.2 a button stops looking like a button at all, so that
  // is where the floor sits for the light theme. Dark has room for the full
  // AA_LARGE bar and is held to it.
  const SOLID_ON_LIGHT = 2.2;

  it.each(themes)('%s: filled controls read as shapes', (theme) => {
    const floor = theme === 'dark' ? AA_LARGE : SOLID_ON_LIGHT;

    for (const [surface] of filled) {
      const ratio = contrastRatio(
        resolve(theme, surface),
        resolve(theme, '--background'),
      );

      expect(
        ratio,
        `${surface} on the ${theme} canvas is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(floor);
    }
  });

  // The focus ring is a UI boundary, and the only thing that makes a keyboard
  // user's position visible. It is wired to the ink for exactly this reason.
  it.each(themes)('%s: the focus ring is visible on the canvas', (theme) => {
    const ratio = contrastRatio(resolve(theme, '--ring'), resolve(theme, '--background'));

    expect(ratio).toBeGreaterThanOrEqual(AA_LARGE);
  });

  // Same four rules again, but against the raw swatches rather than the token
  // maps: an accent the picker can select is never written into the light
  // theme, so it would otherwise ship unchecked.
  const swatches: [string, Swatch][] = [
    ...ACCENTS.map((item): [string, Swatch] => [item.key, item.swatch]),
    ['barbie pink', accent.pink],
    ...Object.entries(status).map(([key, value]): [string, Swatch] => [key, value]),
  ];

  it.each(swatches)('%s carries its own label on its own fill', (key, swatch) => {
    for (const fill of [swatch.solid, swatch.solidDark]) {
      const ratio = contrastRatio(swatch.on, fill);

      expect(
        ratio,
        `${key}: its label on ${fill} is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it.each(swatches)('%s reads as text on both canvases', (key, swatch) => {
    const onLight = contrastRatio(swatch.ink, resolve('light', '--background'));
    const onDark = contrastRatio(swatch.inkDark, resolve('dark', '--background'));

    expect(onLight, `${key} ink on light is ${onLight.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEXT);
    expect(onDark, `${key} ink on dark is ${onDark.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(swatches)('%s reads as a shape on both canvases', (key, swatch) => {
    const onLight = contrastRatio(swatch.solid, resolve('light', '--background'));
    const onDark = contrastRatio(swatch.solidDark, resolve('dark', '--background'));

    expect(onLight, `${key} fill on light is ${onLight.toFixed(2)}:1`).toBeGreaterThanOrEqual(SOLID_ON_LIGHT);
    expect(onDark, `${key} fill on dark is ${onDark.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_LARGE);
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

describe('the three-role rule', () => {
  // `bg-primary` is neon and `--background` is a pale cream, so a bare
  // `text-primary` is orange-on-cream — somewhere around 2.5:1. There is no
  // way to make that legible from the token side, so the rule is enforced from
  // the source side instead: the readable variant is `text-primary-ink`, and
  // the fill is only ever a background.
  const BARE = /\b(text|border)-(primary|income|destructive|warning|info)(?![-a-zA-Z/])/;

  const sources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return sources(full);
      }

      if (/\.tsx?$/.test(entry.name)) {
        return [full];
      }

      return [];
    });

  // The mirror mistake: `-foreground` is the label for a SOLID fill, so on a
  // `bg-x/14` tint it paints white on a pale wash. Found in the wild the day
  // the ink went white, which is why it is a test now.
  const ON_TINT = /bg-(primary|income|destructive|warning|info)\/\d+\D[^\n]*text-\1-foreground/;

  it('no component puts a fill label on a tint', () => {
    const offenders = sources(path.join(ROOT, 'src'))
      .filter((file) => !file.includes(path.join('src', 'design')))
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((line, index) => ({ file, line, number: index + 1 }))
          .filter((entry) => ON_TINT.test(entry.line))
          .map((entry) => `${path.relative(ROOT, entry.file)}:${entry.number}`),
      );

    expect(offenders, 'a tint needs the -ink variant, not -foreground').toEqual([]);
  });

  it('no component paints a neon fill onto the page as text', () => {
    const offenders = sources(path.join(ROOT, 'src'))
      .filter((file) => !file.includes(path.join('src', 'design')))
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((line, index) => ({ file, line, number: index + 1 }))
          .filter((entry) => BARE.test(entry.line))
          .map((entry) => `${path.relative(ROOT, entry.file)}:${entry.number}`),
      );

    expect(offenders, 'use the -ink variant on these lines').toEqual([]);
  });
});

describe('data colours', () => {
  // These are written to the database, so a duplicate means two categories
  // that can never be told apart on a chart.
  it('every user-selectable swatch is distinct', () => {
    expect(new Set(dataColors).size).toBe(dataColors.length);
  });

  it('offers a full grid of swatches', () => {
    expect(dataColors.length).toBeGreaterThanOrEqual(16);
    expect(dataColors.every((color) => /^#[0-9a-f]{6}$/.test(color))).toBe(true);
  });
});

describe('accents', () => {
  it('writes every property it owns, for both themes', () => {
    for (const item of ACCENTS) {
      for (const isDark of [false, true]) {
        const values = accentValues(item.swatch, isDark);

        expect(values, `${item.key} is missing a value`).toHaveLength(4);
        expect(values.every(Boolean)).toBe(true);
      }
    }
  });
});
