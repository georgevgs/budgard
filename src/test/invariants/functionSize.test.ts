import { describe, expect, it } from 'vitest';
import {
  COMPONENT_LINE_CAP,
  measureFunctions,
} from '@/test/invariants/componentSize';

// https://react-typescript-style-guide.com/ caps a component at ~150 lines.
// Nothing enforced the same on a hook, and a 619-line hook is the same
// failure as a 619-line component — it just never showed up in review.
//
// These are the functions that were already over the cap when the rule
// arrived. The list may SHRINK and never grow: the recorded number is a
// ceiling, so an entry that grows fails, an entry that drops under the cap
// fails until it is deleted from the list, and a new offender fails outright.
//
// Four ceilings were re-baselined in Sep 2026 when `curly` made the braced
// guard clause enforced rather than conventional. `if (x) return;` became
// three lines instead of one across ~530 sites, so these functions gained
// height without gaining a single statement. Re-measuring was the honest
// move; the ratchet still holds from the new numbers.
const GRANDFATHERED = new Map<string, number>([
  // Deliberate, not debt: the fetch, the visibility handler and the sign-out
  // reset share one set of mutable refs, and splitting them across hook
  // boundaries is what the React compiler rejects. The reasoning is written at
  // the top of useDataLayer.ts — read it before trying to shrink this one.
  ['useDataLayer', 619],
  ['useExpenseOps', 291],
  ['useCsvImportFlow', 263],
  ['usePwaUpdate', 240],
]);

const ROOTS = [
  'src/common/hooks',
  'src/common/api',
  'src/common/components',
  'src/common/contexts',
  'src/constants',
  'src/config',
  'src/pages',
];

// A `<feature>Api.ts` module is one object literal holding a dozen small query
// methods. Its length tracks how many queries the feature has, not how much
// logic sits in any one of them, so the cap does not apply.
const isApiModule = (file: string): boolean => file.endsWith('Api.ts');

describe('function line cap', () => {
  const measured = measureFunctions(ROOTS).filter(
    (fn) => !isApiModule(fn.file),
  );

  it('finds the functions to measure', () => {
    expect(measured.length).toBeGreaterThan(200);
  });

  it('keeps every new function at or under the cap', () => {
    const offenders = measured
      .filter((fn) => fn.lines > COMPONENT_LINE_CAP)
      .filter((fn) => !GRANDFATHERED.has(fn.name))
      .sort((a, b) => b.lines - a.lines)
      .map((fn) => `${fn.lines} lines — ${fn.name} (${fn.file})`);

    expect(offenders).toEqual([]);
  });

  it('does not let a grandfathered function grow', () => {
    const grown = measured
      .filter((fn) => GRANDFATHERED.has(fn.name))
      .filter((fn) => fn.lines > (GRANDFATHERED.get(fn.name) as number))
      .map(
        (fn) =>
          `${fn.name} grew to ${fn.lines} (ceiling ${GRANDFATHERED.get(fn.name)}) in ${fn.file}`,
      );

    expect(grown).toEqual([]);
  });

  it('drops a function from the list once it is under the cap', () => {
    const measuredByName = new Map(measured.map((fn) => [fn.name, fn.lines]));
    const redundant = [...GRANDFATHERED.keys()].filter((name) => {
      const lines = measuredByName.get(name);
      if (lines === undefined) {
        return true;
      }

      return lines <= COMPONENT_LINE_CAP;
    });

    expect(redundant).toEqual([]);
  });
});
