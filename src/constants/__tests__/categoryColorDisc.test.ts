import { describe, expect, it } from 'vitest';
import { dataColors, swatch } from '@/design/palette';
import {
  WHITE_ON_YELLOW_GREEN_FLOOR,
  getColorDiscStyle,
  getColorTone,
} from '@/constants/categoryColor';

const toLinear = (channel: number): number => {
  if (channel <= 0.04045) {
    return channel / 12.92;
  } else {
    return Math.pow((channel + 0.055) / 1.055, 2.4);
  }
};

const luminance = (hex: string): number => {
  const [red, green, blue] = [1, 3, 5].map((start) =>
    toLinear(Number.parseInt(hex.slice(start, start + 2), 16) / 255),
  );

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const whiteContrast = (hex: string): number => 1.05 / (luminance(hex) + 0.05);

describe('colour tone', () => {
  it.each(dataColors)('carries a white mark on %s', (color) => {
    expect(whiteContrast(getColorTone(color))).toBeGreaterThanOrEqual(
      WHITE_ON_YELLOW_GREEN_FLOOR,
    );
  });

  it('keeps a swatch that already carries white as it is', () => {
    expect(getColorTone(swatch.indigo)).toBe(swatch.indigo);
    expect(getColorTone(swatch.slate)).toBe(swatch.slate);
  });

  it('lifts gold out of mustard rather than darkening it', () => {
    expect(luminance(getColorTone(swatch.gold))).toBeGreaterThan(
      luminance('#c8a000'),
    );
  });

  it('leans lime toward green rather than olive', () => {
    const tone = getColorTone(swatch.lime);
    const red = Number.parseInt(tone.slice(1, 3), 16);
    const green = Number.parseInt(tone.slice(3, 5), 16);

    expect(green - red).toBeGreaterThan(50);
  });

  it('passes a design token through to a chart untouched', () => {
    expect(getColorTone('hsl(var(--income))')).toBe('hsl(var(--income))');
  });

  it('draws a flat fill with a white mark', () => {
    expect(getColorDiscStyle(swatch.gold)).toEqual({
      backgroundColor: getColorTone(swatch.gold),
      color: 'hsl(0 0% 100%)',
    });
  });
});
