import { describe, expect, it } from 'vitest';
import {
  COMPONENT_LINE_CAP,
  measureComponents,
} from '@/test/invariants/componentSize';

// CLAUDE.md: "Structure: 1. Component (max 100 lines) -> 2. export default
// -> 3. // --- Helpers --- section." The June 2026 sweep brought every
// component under the cap; this test is what keeps it there, because drift
// is invisible in review — a component grows six lines at a time.
describe('component line cap', () => {
  const components = measureComponents([
    'src/components',
    'src/pages',
    'src/contexts',
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
