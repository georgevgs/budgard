import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { collectSourceFiles } from '@/test/invariants/componentSize';

const ROOT = path.resolve(__dirname, '../../..');

// https://react-typescript-style-guide.com/ asks for the implicit form when a
// component has no logic — `export const Profile = () => <section>…`. This repo
// writes the braced body instead, for the same reason it braces a guard clause
// and bans ternaries: one shape for every function in the file, so adding a
// line of logic later is not also a reformat.
//
// Pinned because this was the last house rule that was only written down, and
// it had drifted to sixteen implicit bodies against roughly as many braced ones
// — the same way `curly` drifted to ~530 brace-less guards while it was a
// convention rather than a rule. Nine of the sixteen were not exported, and one
// sat at the src/ root, so the walk starts from `src` rather than the
// pages/common pair `componentSize.test.ts` measures.
describe('component bodies', () => {
  it('keep their return rather than taking the implicit form', () => {
    const offenders = collectSourceFiles(['src'])
      .flatMap((file) => findImplicitComponents(file))
      .map((found) => `${path.relative(ROOT, found.file)}:${found.line}`);

    expect(
      offenders,
      'write `=> { return …; }` — see docs/style-guide.md, "Where this repo differs"',
    ).toEqual([]);
  });
});

type ImplicitComponent = {
  file: string;
  line: number;
};

// PascalCase, which needs a lowercase letter somewhere: `KeypadButton` is a
// component, `EXCEEDED_THRESHOLD` is a constant that happens to start capital.
// Not anchored to `export` — a component private to its file is still a
// component, and two of them had drifted where an export-only grep never looked.
const DECLARATION =
  /^(?:export )?const ([A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*)\s*=/;

const findImplicitComponents = (file: string): ImplicitComponent[] => {
  const lines = readFileSync(file, 'utf8').split('\n');

  return lines.flatMap((line, index) => {
    if (!DECLARATION.test(line)) {
      return [];
    }
    const opener = bodyOpener(lines, index);
    if (opener === null || opener === '{') {
      return [];
    }

    return [{ file, line: index + 1 }];
  });
};

// Walks the declaration header from `const Name` to the arrow that opens the
// body, and reports the first character after it. Parameter lists span several
// lines and hold arrows of their own (`format: (value: number) => string`), so
// the arrow that counts is the one at paren depth zero. A `;` at that same
// depth means the statement ended without an arrow — a plain value, not a
// component — and the walk stops rather than running on into the next one.
const bodyOpener = (lines: string[], start: number): string | null => {
  let depth = 0;

  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    for (let column = 0; column < line.length; column += 1) {
      const char = line[column];
      if (char === '(') {
        depth += 1;
      }
      if (char === ')') {
        depth -= 1;
      }
      if (depth > 0) {
        continue;
      }
      if (char === ';') {
        return null;
      }
      if (char === '=' && line[column + 1] === '>') {
        return nextMeaningfulChar(lines, index, column + 2);
      }
    }
  }

  return null;
};

const nextMeaningfulChar = (
  lines: string[],
  start: number,
  column: number,
): string | null => {
  const rest = lines[start].slice(column).trim();
  if (rest.length > 0) {
    return rest[0];
  }

  for (let index = start + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed.length > 0) {
      return trimmed[0];
    }
  }

  return null;
};
