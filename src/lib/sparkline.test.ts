import { describe, expect, it } from 'vitest';
import { buildSparkline } from '@/lib/sparkline';

const VIEW = { width: 100, height: 50, padding: 5 };

describe('buildSparkline', () => {
  it('needs at least two points to draw a line', () => {
    expect(buildSparkline([], VIEW)).toBeNull();
    expect(buildSparkline([10], VIEW)).toBeNull();
  });

  it('spans the full width between the padding', () => {
    const path = buildSparkline([1, 2, 3], VIEW);

    expect(path?.line.startsWith('M 5 ')).toBe(true);
    expect(path?.end.x).toBe(95);
  });

  // Zero is the floor, not the smallest value in the series — rebaselining on
  // the minimum would turn a quiet month into a crash.
  it('measures against zero, not the series minimum', () => {
    const path = buildSparkline([100, 50], VIEW);
    const floor = VIEW.height - VIEW.padding;

    // 50 is half of the peak, so it sits half way up the usable band.
    expect(path?.end.y).toBeCloseTo(floor - (50 / 100) * 40, 5);
  });

  it('flattens an all-zero series instead of dividing by zero', () => {
    const path = buildSparkline([0, 0, 0], VIEW);

    expect(path?.end.y).toBe(VIEW.height - VIEW.padding);
    expect(path?.line).not.toContain('NaN');
  });

  it('closes the area back along the floor', () => {
    const path = buildSparkline([1, 2], VIEW);

    expect(path?.area.endsWith('Z')).toBe(true);
    expect(path?.area).toContain(`L 5 ${VIEW.height - VIEW.padding}`);
  });

  it('never emits NaN for any plausible series', () => {
    for (const values of [
      [0, 1],
      [1, 0],
      [3, 3, 3],
      [0.1, 99999],
    ]) {
      const path = buildSparkline(values, VIEW);

      expect(path?.line).not.toContain('NaN');
      expect(path?.area).not.toContain('NaN');
    }
  });
});
