import { describe, it, expect } from 'vitest';
import { getFreeAnalyticsCutoff } from '@/lib/proLimits';

describe('getFreeAnalyticsCutoff', () => {
  it('returns the first day of the month two months back', () => {
    const cutoff = getFreeAnalyticsCutoff(new Date('2026-07-20T12:00:00'));
    expect(cutoff.getFullYear()).toBe(2026);
    expect(cutoff.getMonth()).toBe(4);
    expect(cutoff.getDate()).toBe(1);
  });

  it('crosses the year boundary correctly', () => {
    const cutoff = getFreeAnalyticsCutoff(new Date('2026-01-15T12:00:00'));
    expect(cutoff.getFullYear()).toBe(2025);
    expect(cutoff.getMonth()).toBe(10);
    expect(cutoff.getDate()).toBe(1);
  });
});
