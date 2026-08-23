/**
 * A smooth line (and the area under it) through a short series of values.
 *
 * The bento tiles carry six-to-twelve point trend curves where a polyline
 * reads as jagged and a full spline library is three orders of magnitude more
 * code than the job needs. This is the midpoint-quadratic construction: each
 * data point becomes the control point of a quadratic whose endpoints are the
 * midpoints of its two segments. Curves stay inside the data's own bounds — it
 * cannot overshoot into a negative-looking dip the way a cubic spline can,
 * which on a spending chart would be a lie about a month.
 */

export type SparklinePath = {
  line: string;
  area: string;
  /** Where the series ends, so a caller can mark "you are here". */
  end: { x: number; y: number };
};

export type SparklineOptions = {
  width: number;
  height: number;
  /** Space kept clear at every edge so the stroke and end cap are not clipped. */
  padding?: number;
};

export const buildSparkline = (
  values: number[],
  { width, height, padding = 6 }: SparklineOptions,
): SparklinePath | null => {
  if (values.length < 2) {
    return null;
  }

  const points = toPoints(values, width, height, padding);
  const line = toLine(points);
  const floor = height - padding;

  const last = points[points.length - 1];

  return {
    line,
    area: `${line} L ${round(last.x)} ${floor} L ${round(points[0].x)} ${floor} Z`,
    end: { x: round(last.x), y: round(last.y) },
  };
};

// --- Helpers ---

type Point = { x: number; y: number };

const round = (value: number): number => Math.round(value * 100) / 100;

// The floor is zero, not the smallest value in the series. A chart that
// rebaselines on its own minimum turns a quiet month into a crash.
const toPoints = (
  values: number[],
  width: number,
  height: number,
  padding: number,
): Point[] => {
  const peak = Math.max(...values, 0);
  const span = width - padding * 2;
  const usable = height - padding * 2;

  return values.map((value, index) => ({
    x: padding + (index / (values.length - 1)) * span,
    y: height - padding - resolveRatio(value, peak) * usable,
  }));
};

const resolveRatio = (value: number, peak: number): number => {
  if (peak <= 0) {
    return 0;
  }

  return value / peak;
};

const toLine = (points: Point[]): string => {
  const [first, ...rest] = points;
  let path = `M ${round(first.x)} ${round(first.y)}`;

  for (let index = 0; index < rest.length - 1; index += 1) {
    const current = rest[index];
    const next = rest[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${round(current.x)} ${round(current.y)} ${round(midX)} ${round(midY)}`;
  }

  const last = rest[rest.length - 1];

  return `${path} L ${round(last.x)} ${round(last.y)}`;
};
