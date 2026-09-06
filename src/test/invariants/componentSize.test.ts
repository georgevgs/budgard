import { describe, expect, it } from 'vitest';
import {
  COMPONENT_LINE_CAP,
  measureComponents,
} from '@/test/invariants/componentSize';

// https://react-typescript-style-guide.com/ — "Size Limit: keep components
// under approximately 150 lines" and "Component Splitting Criteria". This
// test is what keeps them there, because drift is invisible in review: a
// component grows six lines at a time.
describe('component line cap', () => {
  const components = measureComponents([
    'src/pages',
    'src/common',
  ]);

  it('finds the components to measure', () => {
    expect(components.length).toBeGreaterThan(150);
  });

  it('keeps every component at or under the cap', () => {
    const over = components
      .filter((component) => component.lines > COMPONENT_LINE_CAP)
      .sort((a, b) => b.lines - a.lines)
      .map(
        (component) =>
          `${component.lines} lines — ${component.name} (${component.file})`,
      );

    expect(over).toEqual([]);
  });
});
