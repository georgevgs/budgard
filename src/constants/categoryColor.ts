// Category, tag, goal, debt and account colours are user-picked hues stored as
// raw hex, so they are the one part of the UI the design tokens cannot own.
// What they CAN own is how those hues are tinted: every chip used to append
// `20` to the hex — 12.5% alpha over whatever sat behind it — which lands as a
// pale wash on a light card and an almost invisible smudge on a dark one.
// Mixing into the card token instead keeps the tint legible in both themes,
// because the thing being mixed towards flips with the theme.
export const getColorTint = (color: string | null | undefined): string => {
  if (!color) {
    return 'hsl(var(--muted))';
  }

  return `color-mix(in oklab, ${color} 22%, hsl(var(--card)))`;
};

// The solid disc at the head of a transaction row. A user-picked hue at full
// strength, so the mark on it has to pick its own ink: white on the darker
// hues, near-black on the light ones, where white measures about 1.2:1.
export const getColorFill = (color: string | null | undefined): string => {
  if (isFilledColor(color)) {
    return color;
  } else {
    return 'hsl(var(--muted))';
  }
};

export const getColorFillInk = (color: string | null | undefined): string => {
  if (isFilledColor(color) && HEX_COLOR.test(color)) {
    return pickInkForLuminance(relativeLuminance(color));
  } else {
    return 'hsl(var(--foreground))';
  }
};

const isFilledColor = (color: string | null | undefined): color is string =>
  undefined !== color && null !== color && '' !== color;

// #rrggbb, the only shape the colour pickers write.
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const WHITE_INK = 'hsl(0 0% 100%)';
const DARK_INK = 'hsl(0 0% 9%)';

// Above this luminance white falls under 3:1 and near-black wins.
const LIGHT_FILL_LUMINANCE = 0.3;

const pickInkForLuminance = (luminance: number): string => {
  if (luminance > LIGHT_FILL_LUMINANCE) {
    return DARK_INK;
  } else {
    return WHITE_INK;
  }
};

const relativeLuminance = (hex: string): number => {
  const channels = [1, 3, 5].map((start) =>
    toLinearChannel(Number.parseInt(hex.slice(start, start + 2), 16) / 255),
  );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const toLinearChannel = (channel: number): number => {
  if (channel <= 0.03928) {
    return channel / 12.92;
  } else {
    return Math.pow((channel + 0.055) / 1.055, 2.4);
  }
};
