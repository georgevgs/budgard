import type { CSSProperties } from 'react';

// Category, tag, goal, debt and account colours are user-picked hues stored as
// raw hex, so they are the one part of the UI the design tokens cannot own.
//
// What gets drawn is the stored hue at the most saturated colour sRGB has
// that still carries a white mark, flat, the way iOS system colours and
// Revolut's category icons do it. Most swatches come out as themselves. The
// yellow-green band cannot be vivid under white, it turns mustard and olive,
// so its hues lean a little warmer or a little greener and its floor drops to
// 2.15:1, the same drinks-can trade as white on the brand orange.
export const getColorDiscStyle = (
  color: string | null | undefined,
): CSSProperties => {
  return { backgroundColor: getColorTone(color), color: WHITE_INK };
};

// The same colour for anything that is not a disc: a chart mark, a progress
// bar, a legend dot, a picker swatch, so each matches the circle beside it. A
// value that is not a stored hex, such as a design token, passes through.
export const getColorTone = (color: string | null | undefined): string => {
  if (isHexColor(color)) {
    return getCachedTone(color.toLowerCase());
  } else if (undefined !== color && null !== color && '' !== color) {
    return color;
  } else {
    return NEUTRAL_TONE;
  }
};

/** White against the fill, for the contrast test. */
export const WHITE_ON_FILL_FLOOR = 2.35;
export const WHITE_ON_YELLOW_GREEN_FLOOR = 2.15;

type Oklch = { lightness: number; chroma: number; hue: number };

type LinearRgb = [number, number, number];

const WHITE_INK = 'hsl(0 0% 100%)';

const NEUTRAL_TONE = 'hsl(var(--muted-foreground))';

// #rrggbb, the only shape the colour pickers write.
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// Below this a swatch is a grey, steel or slate, and is drawn as stored.
const GREY_CHROMA = 0.06;

// Asked for more chroma than any hue has, so the gamut fit finds the edge.
const FULL_CHROMA = 0.4;

const DEGREE = Math.PI / 180;

// Yellows, gold to citron, lean toward amber.
const WARM_BAND = { from: 70, to: 112 };

// Limes, lime to spring, lean toward green.
const FRESH_BAND = { from: 112, to: 145 };

const BAND_LEAN = 0.45;

// Rounding to 8-bit channels can nudge a fill a hair past its floor.
const ROUNDING_MARGIN = 0.02;

const toneCache = new Map<string, string>();

const isHexColor = (color: string | null | undefined): color is string =>
  undefined !== color && null !== color && HEX_COLOR.test(color);

const getCachedTone = (hex: string): string => {
  const cached = toneCache.get(hex);
  if (undefined !== cached) {
    return cached;
  } else {
    const tone = toTone(hex);
    toneCache.set(hex, tone);

    return tone;
  }
};

const toTone = (hex: string): string => {
  const source = hexToOklch(hex);
  if (source.chroma < GREY_CHROMA) {
    return hex;
  } else {
    return toVividTone(hex, source);
  }
};

// A swatch already dark enough to carry white is drawn exactly as picked.
const toVividTone = (hex: string, source: Oklch): string => {
  const storedDegrees = normaliseDegrees(source.hue / DEGREE);
  const leanedDegrees = leanHue(storedDegrees);
  const hue = leanedDegrees * DEGREE;
  const floor = getWhiteFloor(storedDegrees) + ROUNDING_MARGIN;
  const lightness = findLightnessForWhite(
    hue,
    1.05 / floor - 0.05,
    0.3,
    0.99,
    0,
  );
  if (source.lightness <= lightness && leanedDegrees === storedDegrees) {
    return hex;
  } else {
    return toHex(
      fitToGamut({
        lightness: Math.min(lightness, source.lightness),
        chroma: FULL_CHROMA,
        hue,
      }),
    );
  }
};

const normaliseDegrees = (degrees: number): number => (degrees + 360) % 360;

const leanHue = (degrees: number): number => {
  if (degrees > WARM_BAND.from && degrees <= WARM_BAND.to) {
    return degrees - (degrees - WARM_BAND.from) * BAND_LEAN;
  } else if (degrees > FRESH_BAND.from && degrees < FRESH_BAND.to) {
    return degrees + (FRESH_BAND.to - degrees) * BAND_LEAN;
  } else {
    return degrees;
  }
};

const getWhiteFloor = (degrees: number): number => {
  if (degrees > WARM_BAND.from && degrees < FRESH_BAND.to) {
    return WHITE_ON_YELLOW_GREEN_FLOOR;
  } else {
    return WHITE_ON_FILL_FLOOR;
  }
};

// The lightest fill at this hue whose luminance still sits under the target,
// found by halving the range. Forty halvings is far past a visible step.
const findLightnessForWhite = (
  hue: number,
  targetLuminance: number,
  low: number,
  high: number,
  step: number,
): number => {
  const middle = (low + high) / 2;
  if (40 === step) {
    return middle;
  } else if (
    luminance(fitToGamut({ lightness: middle, chroma: FULL_CHROMA, hue })) >
    targetLuminance
  ) {
    return findLightnessForWhite(hue, targetLuminance, low, middle, step + 1);
  } else {
    return findLightnessForWhite(hue, targetLuminance, middle, high, step + 1);
  }
};

const luminance = (rgb: LinearRgb): number =>
  0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];

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
