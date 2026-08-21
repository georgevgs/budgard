import { describe, expect, it } from 'vitest';
import {
  areaPath,
  bandScale,
  linePath,
  linearScale,
  niceMax,
  niceTicks,
  pointScale,
} from '@/components/charts/chartScales';

const plot = { left: 40, top: 8, width: 300, height: 200 };

describe('linearScale', () => {
  it('maps the ends of the range onto the ends of the axis', () => {
    const scale = linearScale(0, 100, 200, 0);

    expect(scale.to(0)).toBe(200);
    expect(scale.to(100)).toBe(0);
    expect(scale.to(50)).toBe(100);
  });

  it('reads a pixel back to its value', () => {
    const scale = linearScale(0, 100, 200, 0);

    expect(scale.from(100)).toBe(50);
  });

  // A month where every day spent the same amount, or a brand-new account with
  // one snapshot, has no range at all. Dividing by it would render NaN paths.
  it('centres a flat series instead of dividing by zero', () => {
    const scale = linearScale(42, 42, 200, 0);

    expect(scale.to(42)).toBe(100);
    expect(Number.isNaN(scale.to(42))).toBe(false);
  });
});

describe('pointScale', () => {
  it('spans the full plot width', () => {
    const scale = pointScale(5, plot);

    expect(scale.at(0)).toBe(40);
    expect(scale.at(4)).toBe(340);
  });

  it('finds the nearest index for a pointer position', () => {
    const scale = pointScale(5, plot);

    expect(scale.indexAt(40)).toBe(0);
    expect(scale.indexAt(120)).toBe(1);
    expect(scale.indexAt(9999)).toBe(4);
    expect(scale.indexAt(-9999)).toBe(0);
  });

  it('centres a single point', () => {
    const scale = pointScale(1, plot);

    expect(scale.at(0)).toBe(190);
  });
});

describe('bandScale', () => {
  it('centres each bar in its own slot', () => {
    const scale = bandScale(3, plot);

    expect(scale.at(0)).toBe(90);
    expect(scale.at(2)).toBe(290);
    expect(scale.band).toBe(100);
  });

  it('clamps a pointer past the last band', () => {
    const scale = bandScale(3, plot);

    expect(scale.indexAt(999)).toBe(2);
  });
});

describe('niceTicks', () => {
  it('lands on round numbers', () => {
    expect(niceTicks(1000)).toEqual([0, 250, 500, 750, 1000]);
    expect(niceTicks(37)).toEqual([0, 10, 20, 30, 40]);
  });

  it('survives an empty month', () => {
    expect(niceTicks(0)).toEqual([0]);
  });

  it('rounds the axis top up past the tallest point', () => {
    expect(niceMax(37)).toBe(40);
    expect(niceMax(1000)).toBe(1000);
  });
});

describe('paths', () => {
  const points: [number, number][] = [
    [0, 10],
    [10, 0],
    [20, 5],
  ];

  it('draws straight segments when not smoothing', () => {
    expect(linePath(points, false)).toBe('M0,10 L10,0 L20,5');
  });

  it('draws cubic segments when smoothing', () => {
    expect(linePath(points, true)).toContain('C');
  });

  it('closes an area down to the baseline', () => {
    const path = areaPath(points, false, 100);

    expect(path.endsWith('L20,100 L0,100 Z')).toBe(true);
  });

  it('returns nothing for no points rather than a broken path', () => {
    expect(linePath([], true)).toBe('');
    expect(areaPath([], true, 100)).toBe('');
  });
});
