import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '@/locales/en/translation.json';
import el from '@/locales/el/translation.json';

// The legal pages store arrays of sections, so a locale tree is not simply
// nested objects of strings — flatten walks arrays by index too.
type Node = string | number | boolean | Node[] | { [key: string]: Node };

// Every user-facing string goes through t() (CLAUDE.md), so a key that exists
// in one locale and not the other is a screen that renders a raw dotted key to
// somebody. Netlify runs this suite before it builds, so a missed translation
// cannot reach production.
describe('translation parity', () => {
  const enKeys = flatten(en as Node);
  const elKeys = flatten(el as Node);

  it('has no English key missing from Greek', () => {
    const missing = [...enKeys.keys()].filter((key) => !elKeys.has(key));

    expect(missing).toEqual([]);
  });

  it('has no Greek key missing from English', () => {
    const extra = [...elKeys.keys()].filter((key) => !enKeys.has(key));

    expect(extra).toEqual([]);
  });

  it('has no empty values', () => {
    const empty = [...enKeys, ...elKeys]
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });

  // An interpolation that exists on one side and not the other renders as a
  // literal {{amount}} to the user — the failure i18n key parity alone misses.
  it('uses the same interpolations in both locales', () => {
    const mismatched = [...enKeys.entries()]
      .filter(([key, value]) => {
        const translated = elKeys.get(key);
        if (translated === undefined) {
          return false;
        }

        return !sameTokens(value, translated);
      })
      .map(([key]) => key);

    expect(mismatched).toEqual([]);
  });

  // Parity says the two locales agree with each other, not that either holds
  // the key the code asks for. `auth.invalidEmail` was in neither, so the
  // sign-in screen printed the dotted key. Only literal keys can be checked;
  // a key built at runtime is the caller's to keep honest.
  it('has an English entry for every literal key the source asks for', () => {
    const missing = sourceFiles(SRC).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(LITERAL_T_CALL)]
        .map((match) => match[1])
        .filter((key) => !resolves(key, enKeys))
        .map((key) => `${path.relative(SRC, file)}: ${key}`),
    );

    expect(missing).toEqual([]);
  });
});

const SRC = path.resolve(__dirname, '../..');

const LITERAL_T_CALL = /\bt\(\s*['"]([\w.]+)['"]/g;

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') {
        return [];
      }

      return sourceFiles(full);
    }
    if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      return [full];
    }

    return [];
  });

// A plural key lives under its suffixes, and a key read with returnObjects
// names a subtree rather than a leaf.
const resolves = (key: string, keys: Map<string, string>): boolean => {
  if (keys.has(key) || keys.has(`${key}_one`) || keys.has(`${key}_other`)) {
    return true;
  }

  return [...keys.keys()].some((candidate) => candidate.startsWith(`${key}.`));
};

const flatten = (node: Node, prefix = ''): Map<string, string> => {
  const entries = new Map<string, string>();
  if (typeof node === 'string') {
    entries.set(prefix.replace(/\.$/, ''), node);

    return entries;
  }
  if (typeof node !== 'object' || node === null) {
    return entries;
  }

  for (const [key, value] of listChildren(node)) {
    for (const [nested, nestedValue] of flatten(value, `${prefix}${key}.`)) {
      entries.set(nested, nestedValue);
    }
  }

  return entries;
};

const listChildren = (
  node: Node[] | { [key: string]: Node },
): [string, Node][] => {
  if (Array.isArray(node)) {
    return node.map((child, index) => [String(index), child]);
  }

  return Object.entries(node);
};

const INTERPOLATION = /\{\{\s*([\w.]+)\s*(?:,[^}]*)?\}\}/g;

const sameTokens = (a: string, b: string): boolean => {
  const left = [...a.matchAll(INTERPOLATION)].map((m) => m[1]).sort();
  const right = [...b.matchAll(INTERPOLATION)].map((m) => m[1]).sort();

  return left.join('|') === right.join('|');
};
