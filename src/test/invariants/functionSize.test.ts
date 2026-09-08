import { describe, expect, it } from 'vitest';
import {
  COMPONENT_LINE_CAP,
  measureFunctions,
} from '@/test/invariants/componentSize';

// Hooks and utilities follow the same cap as components. The last exception
// was removed when useDataLayer's request state gained one lifecycle owner.

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

  it('keeps every function at or under the cap', () => {
    const offenders = measured
      .filter((fn) => fn.lines > COMPONENT_LINE_CAP)
      .sort((a, b) => b.lines - a.lines)
      .map((fn) => `${fn.lines} lines — ${fn.name} (${fn.file})`);

    expect(offenders).toEqual([]);
  });
});
