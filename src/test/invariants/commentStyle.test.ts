import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');

// `src/common/ui` is vendored shadcn and keeps whatever upstream ships.
const VENDORED = path.join(SRC, 'common', 'ui');
const SELF = path.join(__dirname, 'commentStyle.test.ts');

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (full.startsWith(VENDORED)) {
      return [];
    }

    if (entry.isDirectory()) {
      return sources(full);
    }

    if (/\.tsx?$/.test(entry.name)) {
      return [full];
    }

    return [];
  });

const linesMatching = (
  pattern: RegExp,
  isExempt: (file: string) => boolean = () => false,
): string[] =>
  sources(SRC)
    .filter((file) => !isExempt(file))
    .flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, index) => ({ line, number: index + 1 }))
        .filter((entry) => pattern.test(entry.line))
        .map((entry) => `${path.relative(ROOT, file)}:${entry.number}`),
    );

// A divider that names a section the code cannot — `// --- OFX ---` over one of
// two parsers in the same file — earns its place. `Helpers` does not: the blank
// line below the component already says it.
//
// This is pinned because the sweep has drifted once. The Sep 2026 pass matched
// only the ASCII `// --- Helpers ---` and left 35 box-drawing `// ─── Helpers
// ───` behind, which read identically and were invisible to the same grep.
describe('section dividers', () => {
  it('never restate what the blank line below the component says', () => {
    const offenders = linesMatching(
      /^\s*\/\/\s*[-─═━]{2,}\s*(helpers?|helper render functions?|types?|constants?|utils?|imports?)\s*[-─═━]*\s*$/i,
    );

    expect(
      offenders,
      'a divider has to name something the code cannot — delete these',
    ).toEqual([]);
  });
});

// 112 files each declared their own shape for `t`, under two names and in three
// widths. `TranslateFunction` is that type, once. A helper below a component
// cannot call a hook, so it takes `t` as a parameter — and that parameter has
// exactly one type.
describe('the translate function', () => {
  it('is typed once, not re-declared at the call site', () => {
    const offenders = linesMatching(
      /\bt\??:\s*\((?:key|_key)\s*:\s*string/,
      // The i18next mock has to state the shape it is standing in for.
      (file) => file === path.join(SRC, 'test', 'setup.ts'),
    );

    expect(
      offenders,
      "import TranslateFunction from '@/constants/translate' instead",
    ).toEqual([]);
  });

  it("does not reach past it for i18next's own TFunction", () => {
    const offenders = linesMatching(
      /\bTFunction\b/,
      // This file has to name the token it bans.
      (file) => file === SELF,
    );

    expect(
      offenders,
      'TranslateFunction is the widest of the shapes and i18next’s t is assignable to it',
    ).toEqual([]);
  });
});
