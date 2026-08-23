import { useState } from 'react';
import type { ReactNode } from 'react';

export type DonutSlice = {
  id: string;
  label: string;
  value: number;
  // A raw colour, not a token: slices are coloured by the account or category
  // they represent, which the user picked.
  color: string;
};

type Props = {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  renderTooltip?: (slice: DonutSlice) => ReactNode;
  ariaLabel: string;
};

const GAP_DEGREES = 2;

// A ring rather than a pie: the hole is what lets a small slice still read as
// an arc length instead of a sliver converging on a point.
const DonutChart = ({
  slices,
  size = 112,
  thickness = 22,
  renderTooltip,
  ariaLabel,
}: Props) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total <= 0) {
    return null;
  }

  const radius = size / 2;
  const inner = radius - thickness;
  // Angles are laid out up front rather than accumulated inside the map: a
  // running total mutated during render is exactly the pattern the React
  // compiler rejects, and it is genuinely fragile if the list re-renders
  // partially.
  const arcs = layOutArcs(slices, total);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={ariaLabel}>
        {arcs.map(({ slice, start, end }) => {
          return (
            <path
              key={slice.id}
              d={arcPath(radius, inner, start, end)}
              fill={slice.color}
              stroke="hsl(var(--background))"
              strokeWidth={2}
              opacity={sliceOpacity(activeId, slice.id)}
              onPointerEnter={() => setActiveId(slice.id)}
              onPointerLeave={() => setActiveId(null)}
              className="cursor-pointer transition-opacity"
            />
          );
        })}
      </svg>
      {renderActiveTooltip(slices, activeId, renderTooltip)}
    </div>
  );
};

export default DonutChart;

// --- Helpers ---

type Arc = {
  slice: DonutSlice;
  start: number;
  end: number;
};

// Starting at -90° puts the first slice at twelve o'clock, where a reader
// expects a ring to begin.
const layOutArcs = (slices: DonutSlice[], total: number): Arc[] => {
  let cursor = -90;

  return slices.map((slice) => {
    const start = cursor;
    const end = start + (slice.value / total) * 360;
    cursor = end;

    return { slice, start, end };
  });
};

const sliceOpacity = (activeId: string | null, id: string): number => {
  if (activeId === null || activeId === id) {
    return 1;
  }

  return 0.4;
};

const renderActiveTooltip = (
  slices: DonutSlice[],
  activeId: string | null,
  render: ((slice: DonutSlice) => ReactNode) | undefined,
) => {
  if (!activeId || !render) {
    return null;
  }
  const slice = slices.find((item) => item.id === activeId);
  if (!slice) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute left-1/2 top-full z-10 w-max max-w-[13rem] -translate-x-1/2 pt-2"
    >
      <div className="chart-tooltip">
        {render(slice)}
      </div>
    </div>
  );
};

// One slice as a closed ring segment: out along the start angle, round the
// outer edge, in at the end angle, back round the inner edge.
const arcPath = (
  radius: number,
  inner: number,
  startDegrees: number,
  endDegrees: number,
): string => {
  // Trim half a gap from each end so neighbouring slices do not touch. A slice
  // narrower than the gap keeps a sliver rather than inverting into a negative
  // sweep, which would draw the arc the long way round the ring.
  const sweep = endDegrees - startDegrees;
  const gap = Math.min(GAP_DEGREES, Math.max(sweep - 0.5, 0));
  const start = startDegrees + gap / 2;
  const end = endDegrees - gap / 2;
  const large = largeArcFlag(end - start);

  const outerStart = polar(radius, radius, start);
  const outerEnd = polar(radius, radius, end);
  const innerEnd = polar(radius, inner, end);
  const innerStart = polar(radius, inner, start);

  return [
    `M${outerStart.x},${outerStart.y}`,
    `A${radius},${radius} 0 ${large} 1 ${outerEnd.x},${outerEnd.y}`,
    `L${innerEnd.x},${innerEnd.y}`,
    `A${inner},${inner} 0 ${large} 0 ${innerStart.x},${innerStart.y}`,
    'Z',
  ].join(' ');
};

// SVG needs telling which way round a long arc goes; anything over a half
// turn has to take the long path or it draws the complement of the slice.
const largeArcFlag = (sweep: number): number => {
  if (sweep > 180) {
    return 1;
  }

  return 0;
};

const polar = (centre: number, radius: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;

  return {
    x: round(centre + radius * Math.cos(radians)),
    y: round(centre + radius * Math.sin(radians)),
  };
};

const round = (value: number): number => Math.round(value * 100) / 100;
