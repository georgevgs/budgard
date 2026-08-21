import {
  areaPath,
  bandScale,
  linePath,
  pointScale,
  type Plot,
  type Scale,
} from '@/components/charts/chartScales';
import type { ChartPoint, Series } from '@/components/charts/chartTypes';

type Context = {
  data: ChartPoint[];
  plot: Plot;
  y: Scale;
  activeIndex: number | null;
  hasBars: boolean;
  // How many bar series share each column, so a bar knows how wide its own
  // slot is. A series cannot work this out from itself.
  barCount: number;
};

// One series → the SVG that draws it. Split out of CartesianChart so the chart
// stays a layout component and each mark type is readable on its own.
export const renderSeries = (
  series: Series,
  index: number,
  context: Context,
) => {
  if (series.kind === 'bar') {
    return renderBars(series, index, context);
  }

  return renderCurve(series, context);
};

// --- Helpers ---

const stroke = (color: string) => `hsl(var(${color}))`;

const valuesOf = (data: ChartPoint[], key: string): (number | null)[] =>
  data.map((point) => {
    const value = point[key];
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return null;
    }

    return value;
  });

// A series with gaps is drawn as separate runs rather than one path, so a
// missing month leaves a break instead of a straight line implying data.
const runsOf = (
  values: (number | null)[],
  xAt: (index: number) => number,
  y: Scale,
): [number, number][][] => {
  const runs: [number, number][][] = [];
  let current: [number, number][] = [];

  values.forEach((value, index) => {
    if (value === null) {
      if (current.length > 0) {
        runs.push(current);
      }
      current = [];

      return;
    }
    current.push([xAt(index), y.to(value)]);
  });
  if (current.length > 0) {
    runs.push(current);
  }

  return runs;
};

const renderCurve = (series: Series, context: Context) => {
  const { data, plot, y, activeIndex, hasBars } = context;
  // A chart holding bars puts its line marks on band centres so the two line
  // up; otherwise points sit on the plot edges and use the full width.
  const scale = hasBars ? bandScale(data.length, plot) : pointScale(data.length, plot);
  const xAt = (index: number) => scale.at(index);
  const values = valuesOf(data, series.key);
  const runs = runsOf(values, xAt, y);
  const smooth = series.smooth !== false;
  const baseline = plot.top + plot.height;
  const color = stroke(series.color);
  const showFill = series.kind === 'area' && series.fill !== false;

  return (
    <g key={series.key}>
      {renderFills(showFill, runs, smooth, baseline, series.key)}
      {runs.map((run, runIndex) => (
        <path
          key={`line-${runIndex}`}
          d={linePath(run, smooth)}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashFor(series.dashed)}
        />
      ))}
      {renderActiveDot(values, activeIndex, xAt, y, color)}
    </g>
  );
};

const renderFills = (
  showFill: boolean,
  runs: [number, number][][],
  smooth: boolean,
  baseline: number,
  key: string,
) => {
  if (!showFill) {
    return null;
  }

  return runs.map((run, runIndex) => (
    <path
      key={`fill-${runIndex}`}
      d={areaPath(run, smooth, baseline)}
      fill={`url(#chart-fill-${key})`}
      stroke="none"
    />
  ));
};

const dashFor = (dashed: boolean | undefined): string | undefined => {
  if (!dashed) {
    return undefined;
  }

  return '5 5';
};

// Only the hovered point gets a dot. A dot on every point turns a twelve-month
// line into a dotted mess, and the value is already on the axis and tooltip.
const renderActiveDot = (
  values: (number | null)[],
  activeIndex: number | null,
  xAt: (index: number) => number,
  y: Scale,
  color: string,
) => {
  if (activeIndex === null) {
    return null;
  }
  const value = values[activeIndex];
  if (value === null || value === undefined) {
    return null;
  }

  return (
    <circle
      cx={xAt(activeIndex)}
      cy={y.to(value)}
      r={4.5}
      fill={color}
      stroke="hsl(var(--card))"
      strokeWidth={2}
    />
  );
};

const BAR_GAP = 0.16;

const renderBars = (series: Series, seriesIndex: number, context: Context) => {
  const { data, plot, y, activeIndex } = context;
  const scale = bandScale(data.length, plot);
  const slot = (scale.band * (1 - BAR_GAP)) / Math.max(context.barCount, 1);
  const zero = y.to(0);
  const color = stroke(series.color);

  return (
    <g key={series.key}>
      {data.map((point, index) => {
        const value = point[series.key];
        if (typeof value !== 'number' || value === 0) {
          return null;
        }
        const top = y.to(value);
        const centre = scale.at(index);
        const x = centre - (scale.band * (1 - BAR_GAP)) / 2 + seriesIndex * slot;

        return (
          <rect
            key={`${series.key}-${index}`}
            x={x}
            y={Math.min(top, zero)}
            width={Math.max(slot - 1, 1)}
            height={Math.max(Math.abs(zero - top), 1)}
            rx={Math.min(3, slot / 3)}
            fill={color}
            opacity={barOpacity(activeIndex, index)}
          />
        );
      })}
    </g>
  );
};

// Hovering one column dims the rest, which reads faster than a cursor line
// when the marks are solid blocks rather than a thin curve.
const barOpacity = (activeIndex: number | null, index: number): number => {
  if (activeIndex === null || activeIndex === index) {
    return 1;
  }

  return 0.45;
};
