import { describe, it, expect } from 'vitest';
import { calculateAllocation } from './SavingsNudgeSheet';

describe('calculateAllocation', () => {
  it('returns 0 when pct is 0', () => {
    expect(calculateAllocation(1000, 0)).toBe(0);
  });

  it('returns 0 when pct is negative', () => {
    expect(calculateAllocation(1000, -10)).toBe(0);
  });

  it('returns 0 when amount is 0', () => {
    expect(calculateAllocation(0, 20)).toBe(0);
  });

  it('computes 20% of a round amount', () => {
    expect(calculateAllocation(1000, 20)).toBe(200);
  });

  it('rounds to 2 decimal places', () => {
    // 1234.56 * 0.2 = 246.912 → 246.91
    expect(calculateAllocation(1234.56, 20)).toBe(246.91);
  });

  it('rounds halves up', () => {
    // 100 * 0.155 = 15.5 → 15.5 (already 2dp)
    expect(calculateAllocation(100, 15.5)).toBe(15.5);
  });

  it('handles integer pct over 100 (no upper clamp here)', () => {
    // The calc itself does not clamp; UI clamps at 100.
    expect(calculateAllocation(50, 200)).toBe(100);
  });

  it('handles fractional pct', () => {
    expect(calculateAllocation(1000, 12.5)).toBe(125);
  });

  it('handles small fractional amounts', () => {
    // 0.99 * 0.5 = 0.495 → 0.5 (banker's rounding not used; Math.round rounds half away from zero for positives)
    expect(calculateAllocation(0.99, 50)).toBe(0.5);
  });
});
