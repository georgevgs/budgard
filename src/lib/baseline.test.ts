import { describe, expect, it } from 'vitest';
import { buildBaseline, compareToBaseline } from '@/lib/baseline';

describe('buildBaseline', () => {
  it('describes the middle of a steady run', () => {
    const baseline = buildBaseline([40, 42, 38, 41, 39]);

    expect(baseline.median).toBe(40);
    expect(baseline.count).toBe(5);
  });

  // The whole reason for using a median: one annual insurance payment must not
  // drag the baseline up and hide the weeks that are genuinely unusual.
  it('is not dragged by a single large one-off', () => {
    const steady = buildBaseline([40, 42, 38, 41, 39]);
    const withOutlier = buildBaseline([40, 42, 38, 41, 39, 900]);

    expect(withOutlier.median).toBeCloseTo(40.5, 1);
    expect(Math.abs(withOutlier.median - steady.median)).toBeLessThan(2);
  });

  it('has no opinion about an empty history', () => {
    expect(buildBaseline([])).toEqual({ median: 0, spread: 0, count: 0 });
  });

  // Without a floor, an identical run collapses the spread to zero and every
  // later value reads as infinitely unusual.
  it('floors the spread so near-identical weeks stay unremarkable', () => {
    const baseline = buildBaseline([40, 40, 40, 40, 40]);

    expect(baseline.spread).toBeGreaterThan(0);
    expect(compareToBaseline(41, baseline).verdict).toBe('typical');
  });
});

describe('compareToBaseline', () => {
  const steady = buildBaseline([40, 42, 38, 41, 39, 40, 41]);

  it('says nothing without enough history to know', () => {
    const thin = buildBaseline([40, 90]);

    expect(compareToBaseline(500, thin).verdict).toBe('unknown');
  });

  it('calls an ordinary week typical', () => {
    expect(compareToBaseline(41, steady).verdict).toBe('typical');
  });

  it('notices a week well above normal', () => {
    expect(compareToBaseline(120, steady).verdict).toBe('higher');
    expect(compareToBaseline(120, steady).deviations).toBeGreaterThan(2);
  });

  it('notices a week well below normal', () => {
    expect(compareToBaseline(2, steady).verdict).toBe('lower');
  });

  // The failure the mean-based model had: a history containing one huge week
  // should still flag a merely-large week, because the median ignores the
  // outlier when setting the bar.
  it('still flags a large week in a history that contains a spike', () => {
    const spiky = buildBaseline([40, 42, 38, 41, 39, 900, 40]);

    expect(compareToBaseline(150, spiky).verdict).toBe('higher');
  });
});
