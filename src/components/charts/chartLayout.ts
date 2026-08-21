import type { Plot } from '@/components/charts/chartScales';
import type { ChartPoint, Series } from '@/components/charts/chartTypes';

const AXIS_BOTTOM = 24;
const AXIS_TOP = 10;
const AXIS_RIGHT = 4;
const MIN_AXIS_LEFT = 24;

// The left gutter has to fit the widest y-axis label. Measuring text properly
// would mean a canvas context per chart, so this estimates from the formatted
// string — 6.6px per character at 11px Inter, which is close enough that the
// labels never clip and the plot never leaves a visible gap.
const CHAR_WIDTH = 6.6;

export const buildPlot = (
  width: number,
  height: number,
  formatY: ((value: number) => string) | undefined,
  top: number,
): Plot => {
  const label = formatY ? formatY(top) : String(top);
  const left = Math.max(MIN_AXIS_LEFT, label.length * CHAR_WIDTH + 10);

  return {
    left,
    top: AXIS_TOP,
    width: Math.max(width - left - AXIS_RIGHT, 1),
    height: Math.max(height - AXIS_TOP - AXIS_BOTTOM, 1),
  };
};

// The vertical range every series has to fit inside. Bars always include zero
// — a bar chart whose baseline is not zero misrepresents every comparison on
// it — while a line chart of, say, net worth may legitimately start above it.
export const seriesExtent = (
  data: ChartPoint[],
  series: Series[],
  allowNegative: boolean | undefined,
): { min: number; max: number } => {
  const values = series.flatMap((item) =>
    data
      .map((point) => point[item.key])
      .filter((value): value is number => typeof value === 'number'),
  );

  if (values.length === 0) {
    return { min: 0, max: 1 };
  }

  const max = Math.max(...values, 0);
  if (!allowNegative) {
    return { min: 0, max: Math.max(max, 1) };
  }

  const lowest = Math.min(...values, 0);

  return { min: lowest, max: Math.max(max, 1) };
};
