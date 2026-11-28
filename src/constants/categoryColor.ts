import type { CSSProperties } from 'react';

// Category, tag, goal, debt and account colours are user-picked hues stored as
// raw hex, so they are the one part of the UI the design tokens cannot own.
//
// A disc or chip keeps the hue but not the stored lightness. Every fill is
// drawn in one tone band, a vivid stop at the top left falling to a deeper one
// at the bottom right, so a white mark reads on all twenty-four swatches: the
// light stop clears the palette's 2.3:1 floor for a label on a fill, and the
// middle of the disc, where the icon sits, is about 3:1 or better. A dark
// swatch such as slate keeps its own depth.
export const getColorDiscStyle = (
  color: string | null | undefined,
): CSSProperties => {
  const stops = getColorDiscStops(color);

  return {
    backgroundImage: `linear-gradient(135deg, ${stops.light}, ${stops.deep})`,
    color: WHITE_INK,
  };
};

export const getColorDiscStops = (
  color: string | null | undefined,
): { light: string; deep: string } => {
  if (isHexColor(color)) {
    return toDiscStops(hexToOklch(color));
  } else {
    return toDiscStops(NEUTRAL_DISC);
  }
};

type Oklch = { lightness: number; chroma: number; hue: number };

type LinearRgb = [number, number, number];

const WHITE_INK = 'hsl(0 0% 100%)';

// The top of the tone band. Any lighter and white falls under the floor.
const LIGHT_STOP_CEILING = 0.715;

// How far the deep stop sits under the light one.
const DISC_DEPTH = 0.14;

// A neon swatch is calmed to this, past it the fill reads as a highlighter.
const MAX_CHROMA = 0.21;

// Lifts a mid-dark swatch a touch so its gradient still has a lit edge.
const LIGHT_STOP_LIFT = 0.04;

// A disc with no colour of its own, a plain grey in the same band.
const NEUTRAL_DISC: Oklch = { lightness: 0.62, chroma: 0, hue: 0 };

// #rrggbb, the only shape the colour pickers write.
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const isHexColor = (color: string | null | undefined): color is string =>
  undefined !== color && null !== color && HEX_COLOR.test(color);

const toDiscStops = (source: Oklch): { light: string; deep: string } => {
  const lightness = Math.min(
    LIGHT_STOP_CEILING,
    source.lightness + LIGHT_STOP_LIFT,
  );
  const chroma = Math.min(source.chroma, MAX_CHROMA);

  return {
    light: toHex(fitToGamut({ lightness, chroma, hue: source.hue })),
    deep: toHex(
      fitToGamut({
        lightness: lightness - DISC_DEPTH,
        chroma,
        hue: source.hue,
      }),
    ),
  };
};

// OKLab, from Björn Ottosson's reference matrices.
const hexToOklch = (hex: string): Oklch => {
  const [red, green, blue] = [1, 3, 5].map((start) =>
    toLinearChannel(Number.parseInt(hex.slice(start, start + 2), 16) / 255),
  );
  const long = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue,
  );
  const medium = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue,
  );
  const short = Math.cbrt(
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue,
  );
  const axisA =
    1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short;
  const axisB =
    0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short;

  return {
    lightness:
      0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
    chroma: Math.hypot(axisA, axisB),
    hue: Math.atan2(axisB, axisA),
  };
};

const oklchToLinearRgb = (color: Oklch): LinearRgb => {
  const axisA = color.chroma * Math.cos(color.hue);
  const axisB = color.chroma * Math.sin(color.hue);
  const long =
    (color.lightness + 0.3963377774 * axisA + 0.2158037573 * axisB) ** 3;
  const medium =
    (color.lightness - 0.1055613458 * axisA - 0.0638541728 * axisB) ** 3;
  const short =
    (color.lightness - 0.0894841775 * axisA - 1.291485548 * axisB) ** 3;

  return [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ];
};

// Gives up chroma, never lightness, until the colour exists in sRGB. Lightness
// is what holds the white mark's contrast, so it is the one thing kept.
const fitToGamut = (color: Oklch): LinearRgb => {
  const rgb = oklchToLinearRgb(color);
  if (isInGamut(rgb) || color.chroma < 0.001) {
    return clampRgb(rgb);
  } else {
    return fitToGamut({ ...color, chroma: color.chroma * 0.96 });
  }
};

const isInGamut = (rgb: LinearRgb): boolean =>
  rgb.every((channel) => channel >= -0.000001 && channel <= 1.000001);

const clampRgb = (rgb: LinearRgb): LinearRgb => [
  clampChannel(rgb[0]),
  clampChannel(rgb[1]),
  clampChannel(rgb[2]),
];

const clampChannel = (channel: number): number =>
  Math.min(1, Math.max(0, channel));

const toHex = (rgb: LinearRgb): string =>
  `#${rgb
    .map((channel) =>
      Math.round(toGammaChannel(channel) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

const toLinearChannel = (channel: number): number => {
  if (channel <= 0.04045) {
    return channel / 12.92;
  } else {
    return Math.pow((channel + 0.055) / 1.055, 2.4);
  }
};

const toGammaChannel = (channel: number): number => {
  if (channel <= 0.0031308) {
    return 12.92 * channel;
  } else {
    return 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
  }
};
