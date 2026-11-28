import { describe, expect, it } from 'vitest';
import { getColorFill, getColorFillInk } from '@/constants/categoryColor';

describe('solid category disc', () => {
  it('carries a near-black mark on a light hue', () => {
    expect(getColorFillInk('#bbff00')).toBe('hsl(0 0% 9%)');
  });

  it('carries a white mark on a dark hue', () => {
    expect(getColorFillInk('#1d4ed8')).toBe('hsl(0 0% 100%)');
  });

  it('falls back to the muted disc and ink without a colour', () => {
    expect(getColorFill(null)).toBe('hsl(var(--muted))');
    expect(getColorFillInk(null)).toBe('hsl(var(--foreground))');
  });
});
