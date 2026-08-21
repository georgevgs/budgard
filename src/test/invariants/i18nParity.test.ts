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
});

// --- Helpers ---

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
