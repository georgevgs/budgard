// The arithmetic behind every chart in the app, kept pure so it can be tested
// without rendering anything. Nothing here knows about React or SVG elements —
// it turns numbers into coordinates and back.

export type Plot = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type Scale = {
  // Value → pixel on the axis.
  to: (value: number) => number;
  // Pixel → value, for reading a pointer position back into data space.
  from: (pixel: number) => number;
};

export const linearScale = (
  min: number,
  max: number,
  pixelStart: number,
  pixelEnd: number,
): Scale => {
  // A flat series (every point identical, or a single point) has no range to
  // divide by. Pinning it to the middle of the axis beats dividing by zero.
  const span = max - min;
  if (span === 0) {
    const middle = (pixelStart + pixelEnd) / 2;

    return { to: () => middle, from: () => min };
  }

  const ratio = (pixelEnd - pixelStart) / span;

  return {
    to: (value) => pixelStart + (value - min) * ratio,
    from: (pixel) => min + (pixel - pixelStart) / ratio,
  };
};

// Evenly spaced positions for a categorical axis. Line and area series sit ON
// the positions; bars are centred on them and share the band between.
export const pointScale = (count: number, plot: Plot) => {
  if (count <= 1) {
    const centre = plot.left + plot.width / 2;

    return { at: () => centre, step: plot.width, indexAt: () => 0 };
  }

  const step = plot.width / (count - 1);

  return {
    at: (index: number) => plot.left + index * step,
    step,
    indexAt: (pixel: number) =>
      clamp(Math.round((pixel - plot.left) / step), 0, count - 1),
  };
};

// Bars need a slot rather than a position, so the first and last are not half
// off the edge of the plot the way a point scale would put them.
export const bandScale = (count: number, plot: Plot) => {
  const band = plot.width / Math.max(count, 1);

  return {
    at: (index: number) => plot.left + index * band + band / 2,
    band,
    indexAt: (pixel: number) =>
      clamp(Math.floor((pixel - plot.left) / band), 0, Math.max(count - 1, 0)),
  };
};

// Axis labels land on round numbers rather than wherever the data happens to
// end — 0 / 250 / 500 / 750 reads instantly where 0 / 237 / 474 / 711 does not.
export const niceTicks = (max: number, count = 4): number[] => {
  if (max <= 0) {
    return [0];
  }

  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = niceStep(rough / magnitude) * magnitude;
  // Run to the tick at or above max, never to max itself — stopping short
  // would put the tallest point above the top gridline.
  const top = Math.ceil(max / step - 0.000001) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top + step * 0.001; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }

  return ticks;
};

// Rounds the axis top up to the next tick so the tallest point never touches
// the ceiling of the plot.
export const niceMax = (max: number, count = 4): number => {
  const ticks = niceTicks(max, count);

  return ticks[ticks.length - 1] || 1;
};

// Builds the `d` of a polyline through the given points. `smooth` uses a
// monotone-ish cubic: control points sit on the horizontal midpoint, which
// keeps the curve from overshooting past a local maximum the way a plain
// cardinal spline does — an overshoot on a spending chart draws a peak that
// never happened.
export const linePath = (
  points: readonly [number, number][],
  smooth: boolean,
): string => {
  if (points.length === 0) {
    return '';
  }
  if (points.length === 1 || !smooth) {
    return points
      .map(
        ([x, y], index) => `${index === 0 ? 'M' : 'L'}${round(x)},${round(y)}`,
      )
      .join(' ');
  }

  let path = `M${round(points[0][0])},${round(points[0][1])}`;
  for (let index = 1; index < points.length; index += 1) {
    const [previousX, previousY] = points[index - 1];
    const [x, y] = points[index];
    const midX = (previousX + x) / 2;
    path += ` C${round(midX)},${round(previousY)} ${round(midX)},${round(y)} ${round(x)},${round(y)}`;
  }

  return path;
};

// Closes a line path down to the baseline so it can be filled.
export const areaPath = (
  points: readonly [number, number][],
  smooth: boolean,
  baseline: number,
): string => {
  if (points.length === 0) {
    return '';
  }

  const line = linePath(points, smooth);
  const lastX = points[points.length - 1][0];
  const firstX = points[0][0];

  return `${line} L${round(lastX)},${round(baseline)} L${round(firstX)},${round(baseline)} Z`;
};

// --- Helpers ---

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const round = (value: number): number => Math.round(value * 100) / 100;

// The classic 1/2/2.5/5/10 ladder. 2.5 earns its place: without it a 1000 max
// jumps from a 200 step to a 500 step and the axis drops from four intervals
// to two, which reads as a much coarser chart than the data deserves.
const niceStep = (normalised: number): number => {
  if (normalised <= 1) {
    return 1;
  }
  if (normalised <= 2) {
    return 2;
  }
  if (normalised <= 2.5) {
    return 2.5;
  }
  if (normalised <= 5) {
    return 5;
  }

  return 10;
};
