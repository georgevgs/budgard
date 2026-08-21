import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// CLAUDE.md caps the component function itself at 100 lines — not the file.
// Helpers live below `export default`, so a file holding one component and
// six render helpers is compliant while a single 120-line component is not.
export const COMPONENT_LINE_CAP = 100;

export type ComponentSize = {
  file: string;
  name: string;
  lines: number;
};

// shadcn primitives are generated code we do not modify (see CLAUDE.md).
const SKIPPED_DIRS = ['ui'];

export const measureComponents = (roots: string[]): ComponentSize[] => {
  return roots.flatMap(collectFiles).flatMap(measureFile);
};

// --- Helpers ---

const collectFiles = (dir: string): string[] => {
  if (!isDirectory(dir)) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.includes(entry.name)) {
        return [];
      }

      return collectFiles(path);
    }
    if (!path.endsWith('.tsx')) {
      return [];
    }
    if (path.endsWith('.test.tsx')) {
      return [];
    }

    return [path];
  });
};

const isDirectory = (path: string): boolean => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

// A component is a top-level arrow assigned to a capitalised const. Prettier
// is not clean across this repo (see the project notes), so the closing line
// cannot be matched by shape — the span is found by counting delimiters.
const DECLARATION = /^(?:export )?const ([A-Z]\w*)\s*[:=]/;

const measureFile = (file: string): ComponentSize[] => {
  const lines = readFileSync(file, 'utf8').split('\n');

  return lines.flatMap((line, index) => {
    const match = DECLARATION.exec(line);
    if (!match) {
      return [];
    }
    const end = findDeclarationEnd(lines, index);
    if (end === null) {
      return [];
    }

    return [{ file, name: match[1], lines: end - index + 1 }];
  });
};

// Walks forward from the declaration tracking `{ ( [` depth, ignoring anything
// inside a string, template literal or comment. The declaration ends on the
// line where depth first returns to zero.
const findDeclarationEnd = (
  lines: string[],
  start: number,
): number | null => {
  const state: ScanState = { depth: 0, inBlockComment: false, opened: false };

  for (let index = start; index < lines.length; index += 1) {
    scanLine(lines[index], state);
    if (state.opened && state.depth <= 0) {
      return index;
    }
  }

  return null;
};

type ScanState = {
  depth: number;
  inBlockComment: boolean;
  opened: boolean;
};

const OPENERS = '{([';
const CLOSERS = '})]';

const scanLine = (line: string, state: ScanState): void => {
  let index = 0;
  while (index < line.length) {
    const char = line[index];
    const next = line[index + 1];

    if (state.inBlockComment) {
      if (char === '*' && next === '/') {
        state.inBlockComment = false;
        index += 2;
        continue;
      }
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      state.inBlockComment = true;
      index += 2;
      continue;
    }
    if (char === '/' && next === '/') {
      return;
    }
    if (char === '"' || char === "'" || char === '`') {
      index = skipString(line, index);
      continue;
    }
    if (OPENERS.includes(char)) {
      state.depth += 1;
      state.opened = true;
    }
    if (CLOSERS.includes(char)) {
      state.depth -= 1;
    }
    index += 1;
  }
};

// Returns the index just past the closing quote. A template literal that runs
// past the end of the line (or holds a `${}` expression) is treated as opaque
// to the end of the line — good enough, because a declaration never ends
// inside one.
const skipString = (line: string, start: number): number => {
  const quote = line[start];
  for (let index = start + 1; index < line.length; index += 1) {
    if (line[index] === '\\') {
      index += 1;
      continue;
    }
    if (line[index] === quote) {
      return index + 1;
    }
  }

  return line.length;
};
