import { describe, expect, it } from 'vitest';
import { dataColors, swatch } from '@/design/palette';
import {
  getColorDiscStops,
  getColorDiscStyle,
} from '@/constants/categoryColor';

// The palette's floor for a label riding a fill, see `on` in palette.ts.
const LABEL_ON_FILL_FLOOR = 2.3;

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

describe('colour disc', () => {
  it.each(dataColors)('carries a white mark on %s', (color) => {
    const stops = getColorDiscStops(color);

    expect(whiteContrast(stops.light)).toBeGreaterThanOrEqual(
      LABEL_ON_FILL_FLOOR,
    );
    expect(luminance(stops.deep)).toBeLessThan(luminance(stops.light));
  });

  it('keeps a dark swatch dark rather than lifting it into the band', () => {
    expect(
      whiteContrast(getColorDiscStops(swatch.slate).light),
    ).toBeGreaterThan(7);
  });

  it('draws a grey disc with a white mark when there is no colour', () => {
    const style = getColorDiscStyle(null);

    expect(style.color).toBe('hsl(0 0% 100%)');
    expect(style.backgroundImage).toMatch(/^linear-gradient\(135deg, #/);
  });
});
