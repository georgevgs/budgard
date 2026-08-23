/**
 * WCAG 2.1 contrast maths over the bare HSL triples the tokens are written in.
 *
 * Exists so contrast is a thing the build checks rather than a thing someone
 * remembers to check: `tokens.test.ts` runs every filled control's colour pair
 * through `contrastRatio` and fails when a hue drifts past the threshold.
 */

const toChannels = (value: string): [number, number, number] => {
  const [hue, saturation, lightness] = value
    .split(' ')
    .map((part) => Number.parseFloat(part));

  const light = lightness / 100;
  const chroma = (saturation / 100) * Math.min(light, 1 - light);

  const channel = (offset: number): number => {
    const position = (offset + hue / 30) % 12;

    return light - chroma * Math.max(-1, Math.min(position - 3, 9 - position, 1));
  };

  return [channel(0), channel(8), channel(4)];
};

const toLinear = (channel: number): number => {
  if (channel <= 0.03928) {
    return channel / 12.92;
  }

  return Math.pow((channel + 0.055) / 1.055, 2.4);
};

/** Relative luminance, 0 (black) to 1 (white). */
const luminance = (hsl: string): number => {
  const [red, green, blue] = toChannels(hsl).map(toLinear);

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

/** Contrast between two HSL triples, 1 (identical) to 21 (black on white). */
export const contrastRatio = (foreground: string, background: string): number => {
  const first = luminance(foreground);
  const second = luminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
};

/** WCAG AA for body-sized text — the bar every button label has to clear. */
export const AA_TEXT = 4.5;

/** WCAG AA for large text, icons and UI boundaries. */
export const AA_LARGE = 3;
