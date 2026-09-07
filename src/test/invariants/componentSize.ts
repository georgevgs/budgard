import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The style guide caps a component at ~150 lines. That is the component
// function itself, not the file: helpers live below `export default`, so a
// file holding one component and six render helpers is compliant while a
// single 160-line component is not.
export const COMPONENT_LINE_CAP = 150;

export type ComponentSize = {
  file: string;
  name: string;
  lines: number;
};

// shadcn primitives are generated code we do not modify (see CLAUDE.md).
const SKIPPED_DIRS = ['ui'];

export const measureComponents = (roots: string[]): ComponentSize[] => {
  return roots
    .flatMap((root) => collectFiles(root))
    .flatMap((file) => measureFile(file, COMPONENT));
};

// The same walk over camelCase top-level declarations: hooks, API modules and
// utilities. A 600-line hook is the same failure as a 600-line component, and
// until now nothing looked outside src/pages and src/common/components.
export const measureFunctions = (roots: string[]): ComponentSize[] => {
  return roots
    .flatMap((root) => collectFiles(root, ['.ts', '.tsx']))
    .flatMap((file) => measureFile(file, FUNCTION));
};

// --- Helpers ---

const collectFiles = (dir: string, extensions = ['.tsx']): string[] => {
  if (!isDirectory(dir)) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.includes(entry.name)) {
        return [];
      }

      return collectFiles(path, extensions);
    }
    if (!extensions.some((extension) => path.endsWith(extension))) {
      return [];
    }
    if (path.endsWith('.test.ts') || path.endsWith('.test.tsx')) {
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
const COMPONENT = /^(?:export )?const ([A-Z]\w*)\s*[:=]/;
const FUNCTION = /^(?:export )?const ([a-z]\w*)\s*[:=]/;

const measureFile = (file: string, declaration: RegExp): ComponentSize[] => {
  const lines = readFileSync(file, 'utf8').split('\n');

  return lines.flatMap((line, index) => {
    const match = declaration.exec(line);
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
const findDeclarationEnd = (lines: string[], start: number): number | null => {
  const state: ScanState = { depth: 0, isInBlockComment: false, opened: false };

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
  isInBlockComment: boolean;
  opened: boolean;
};

const OPENERS = '{([';
const CLOSERS = '})]';

const scanLine = (line: string, state: ScanState): void => {
  let index = 0;
  while (index < line.length) {
    const char = line[index];
    const next = line[index + 1];

    if (state.isInBlockComment) {
      if (char === '*' && next === '/') {
        state.isInBlockComment = false;
        index += 2;
        continue;
      }
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      state.isInBlockComment = true;
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
