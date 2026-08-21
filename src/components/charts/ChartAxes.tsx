import { bandScale, pointScale, type Plot, type Scale } from '@/components/charts/chartScales';
import type { ChartPoint, ReferenceMarker } from '@/components/charts/chartTypes';

type YProps = {
  ticks: number[];
  y: Scale;
  plot: Plot;
  format: (value: number) => string;
};

// Horizontal gridlines with their value on the left. The lines are the axis —
// there is no drawn spine, because a rule at every labelled value already tells
// you where you are and one more vertical line is just ink.
export const YAxis = ({ ticks, y, plot, format }: YProps) => (
  <g aria-hidden="true">
    {ticks.map((tick) => {
      const position = y.to(tick);

      return (
        <g key={tick}>
          <line
            x1={plot.left}
            x2={plot.left + plot.width}
            y1={position}
            y2={position}
            stroke="hsl(var(--border))"
            strokeWidth={1}
            opacity={gridOpacity(tick)}
          />
          <text
            x={plot.left - 8}
            y={position}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-muted-foreground text-[11px] tabular-nums"
          >
            {format(tick)}
          </text>
        </g>
      );
    })}
  </g>
);

type XProps = {
  data: ChartPoint[];
  xKey: string;
  plot: Plot;
  hasBars: boolean;
  format?: (value: string, index: number) => string;
};

export const XAxis = ({ data, xKey, plot, hasBars, format }: XProps) => {
  const scale = hasBars ? bandScale(data.length, plot) : pointScale(data.length, plot);
  const visible = visibleTickIndices(data.length, plot.width);

  return (
    <g aria-hidden="true">
      {data.map((point, index) => {
        if (!visible.has(index)) {
          return null;
        }
        const raw = String(point[xKey] ?? '');

        return (
          <text
            key={`${raw}-${index}`}
            x={scale.at(index)}
            y={plot.top + plot.height + 16}
            textAnchor={anchorFor(index, data.length, hasBars)}
            className="fill-muted-foreground text-[11px]"
          >
            {formatLabel(raw, index, format)}
          </text>
        );
      })}
    </g>
  );
};

type ReferenceProps = {
  marker: ReferenceMarker;
  y: Scale;
  plot: Plot;
};

export const ReferenceLine = ({ marker, y, plot }: ReferenceProps) => {
  const position = y.to(marker.value);
  const color = `hsl(var(${marker.color ?? '--warning'}))`;

  return (
    <g aria-hidden="true">
      <line
        x1={plot.left}
        x2={plot.left + plot.width}
        y1={position}
        y2={position}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="5 5"
      />
      {renderReferenceLabel(marker.label, color, plot, position)}
    </g>
  );
};

// --- Helpers ---

const LABEL_WIDTH = 58;

// A phone fits roughly one label per 45px, so only every nth one is drawn
// rather than shrinking them all to illegibility. The last point always gets a
// label — the end of the range is the thing a reader looks for — and any
// strided label too close to it is dropped, which is what stopped "Nov" and
// "Dec" printing on top of each other at the right edge.
const visibleTickIndices = (count: number, width: number): Set<number> => {
  if (count === 0) {
    return new Set();
  }

  const stride = Math.max(1, Math.ceil((count * LABEL_WIDTH) / Math.max(width, 1)));
  const last = count - 1;
  const indices = new Set<number>();
  for (let index = 0; index <= last; index += stride) {
    indices.add(index);
  }

  for (const index of [...indices]) {
    if (index !== last && last - index < stride) {
      indices.delete(index);
    }
  }
  indices.add(last);

  return indices;
};

// The zero line is structural; the rest are guides and sit back.
const gridOpacity = (tick: number): number => {
  if (tick === 0) {
    return 0.9;
  }

  return 0.4;
};

// Edge labels on a point scale sit exactly on the plot boundary, so centring
// them would hang half the text outside the chart.
type TextAnchor = 'start' | 'middle' | 'end';

const anchorFor = (
  index: number,
  count: number,
  hasBars: boolean,
): TextAnchor => {
  if (hasBars) {
    return 'middle';
  }
  if (index === 0) {
    return 'start';
  }
  if (index === count - 1) {
    return 'end';
  }

  return 'middle';
};

const formatLabel = (
  raw: string,
  index: number,
  format?: (value: string, index: number) => string,
): string => {
  if (!format) {
    return raw;
  }

  return format(raw, index);
};

const renderReferenceLabel = (
  label: string | undefined,
  color: string,
  plot: Plot,
  position: number,
) => {
  if (!label) {
    return null;
  }

  return (
    <text
      x={plot.left + plot.width}
      y={position - 6}
      textAnchor="end"
      className="text-[11px] font-medium"
      fill={color}
    >
      {label}
    </text>
  );
};
