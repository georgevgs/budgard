import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const STYLESHEET = path.join(SRC, 'index.css');

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return sources(full);
    }

    if (/\.tsx$/.test(entry.name)) {
      return [full];
    }

    return [];
  });

const linesMatching = (pattern: RegExp): string[] =>
  sources(SRC).flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .map((line, index) => ({ line, number: index + 1 }))
      .filter((entry) => pattern.test(entry.line))
      .map((entry) => `${path.relative(ROOT, file)}:${entry.number}`),
  );

// The display face used to be summoned by hand at every heading and every
// amount in the app — `font-display text-… font-semibold tracking-[-0.0Xem]`,
// thirty-nine times, with the tracking guessed per call site and the weight
// at 600 in all of them. That is why a 3.5rem headline figure and a 1rem
// section heading were set in the same weight.
//
// The `.type-*` scale in index.css is now the only thing that names the face,
// so weight and optical tracking come from one place and a new screen cannot
// quietly reintroduce a fortieth variant.
describe('the type scale', () => {
  it('is the only thing that names the display face', () => {
    const offenders = linesMatching(/\bfont-display\b/);

    expect(
      offenders,
      'use a .type-* class rather than naming the display face',
    ).toEqual([]);
  });

  it('owns the weight of every element it sets', () => {
    const offenders = linesMatching(/\btype-(slab|figure|title|heading|wordmark)[\w-]*\b[^"'`]*\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/);

    expect(
      offenders,
      'weight carries rank in this scale — do not override it at a call site',
    ).toEqual([]);
  });

  it('defines every class the app asks for', () => {
    const stylesheet = readFileSync(STYLESHEET, 'utf8');
    const used = new Set<string>();

    for (const file of sources(SRC)) {
      const matches = readFileSync(file, 'utf8').matchAll(
        /\b(type-[a-z-]+)\b/g,
      );

      for (const match of matches) {
        used.add(match[1]);
      }
    }

    const missing = [...used].filter(
      (name) => !stylesheet.includes(`.${name} {`),
    );

    expect(missing, 'these .type-* classes are not defined').toEqual([]);
  });
});
