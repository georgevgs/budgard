import { useChartSize } from '@/components/charts/useChartSize';

// A two-stage flow diagram: one source bar splits into several destination
// bars, connected by ribbons whose width is proportional to each node's
// share. Built for a single source with no further branching — the "category
// only" cash-flow view — not a general multi-level Sankey.
export type FlowNode = {
  id: string;
  label: string;
  sublabel: string;
  value: number;
  // A ready-to-use CSS colour — a category's own picked hex (as DonutChart
  // takes it), or a resolved token string like 'hsl(var(--income))' for a
  // branch that carries the app's own meaning rather than a user's pick.
  color: string;
};

type Props = {
  sourceLabel: string;
  sourceSublabel: string;
  sourceValue: number;
  nodes: FlowNode[];
  ariaLabel: string;
};

const NODE_WIDTH = 6;
const NODE_GAP = 10;
// Every row gets this much height unconditionally — enough for a two-line
// label — regardless of how small its share is. A real month is often
// dominated by one category, and a naive proportional split would starve
// every smaller one below where its own label can fit, or push later rows
// past the chart's own height entirely.
const MIN_ROW_HEIGHT = 42;
// Extra height on top of that guaranteed minimum, handed out by share so the
// biggest branch still reads as visually bigger.
const EXTRA_HEIGHT_BUDGET = 220;
const LEFT_MARGIN = 4;
const LABEL_COLUMN_RATIO = 0.46;

const FlowChart = ({
  sourceLabel,
  sourceSublabel,
  sourceValue,
  nodes,
  ariaLabel,
}: Props) => {
  const { ref, width } = useChartSize();
  const height =
    nodes.length * MIN_ROW_HEIGHT +
    NODE_GAP * Math.max(0, nodes.length - 1) +
    EXTRA_HEIGHT_BUDGET;
  const total = nodes.reduce((sum, node) => sum + node.value, 0);

  if (width === 0 || total <= 0) {
    return <div ref={ref} style={{ height }} aria-hidden="true" />;
  }

  const rightX = width - NODE_WIDTH;
  const ribbonRight = rightX - width * LABEL_COLUMN_RATIO;
  const ribbonLeft = LEFT_MARGIN + NODE_WIDTH;
  const sourceBarHeight = height * Math.min(sourceValue / total, 1);
  const destinations = layOutDestinations(nodes, total);
  const sourceSlices = layOutSourceSlices(nodes, total, sourceBarHeight);

  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        {destinations.map((destination, index) =>
          renderRibbon(
            destination,
            sourceSlices[index],
            ribbonLeft,
            ribbonRight,
          ),
        )}
        <rect
          x={LEFT_MARGIN}
          y={0}
          width={NODE_WIDTH}
          height={sourceBarHeight}
          rx={2}
          fill="hsl(var(--foreground))"
        />
        {renderSourceLabel(sourceLabel, sourceSublabel, sourceBarHeight)}
        {destinations.map((destination) =>
          renderDestination(destination, rightX),
        )}
      </svg>
    </div>
  );
};

export default FlowChart;

// --- Helpers ---

type LaidOutNode = FlowNode & { top: number; bottom: number };

// Destination bars stack top to bottom with a fixed gap between them. Each
// gets the guaranteed minimum plus a share of the extra budget proportional
// to its value, so the total always sums to exactly the chart's own height.
const layOutDestinations = (
  nodes: FlowNode[],
  total: number,
): LaidOutNode[] => {
  let cursor = 0;

  return nodes.map((node) => {
    const barHeight =
      MIN_ROW_HEIGHT + (node.value / total) * EXTRA_HEIGHT_BUDGET;
    const top = cursor;
    cursor += barHeight + NODE_GAP;

    return { ...node, top, bottom: top + barHeight };
  });
};

// The source bar's own slices pack contiguously with no gap — same bar, cut
// into shares — so the ribbon leaving each slice tapers smoothly into its
// (gapped) destination.
const layOutSourceSlices = (
  nodes: FlowNode[],
  total: number,
  sourceBarHeight: number,
): { top: number; bottom: number }[] => {
  let cursor = 0;

  return nodes.map((node) => {
    const sliceHeight = (node.value / total) * sourceBarHeight;
    const top = cursor;
    cursor += sliceHeight;

    return { top, bottom: top + sliceHeight };
  });
};

// A ribbon's top and bottom edges are each a cubic curve between the source
// slice and the destination bar; the two curves share a horizontal midpoint,
// which is what gives the flow its S-shape.
const ribbonPath = (
  x0: number,
  source: { top: number; bottom: number },
  x1: number,
  destination: { top: number; bottom: number },
): string => {
  const midX = (x0 + x1) / 2;

  return [
    `M${x0},${source.top}`,
    `C${midX},${source.top} ${midX},${destination.top} ${x1},${destination.top}`,
    `L${x1},${destination.bottom}`,
    `C${midX},${destination.bottom} ${midX},${source.bottom} ${x0},${source.bottom}`,
    'Z',
  ].join(' ');
};

const renderRibbon = (
  destination: LaidOutNode,
  sourceSlice: { top: number; bottom: number },
  x0: number,
  x1: number,
) => {
  return (
    <path
      key={destination.id}
      d={ribbonPath(x0, sourceSlice, x1, destination)}
      fill={destination.color}
      fillOpacity={0.45}
    />
  );
};

const renderSourceLabel = (
  label: string,
  sublabel: string,
  barHeight: number,
) => {
  const y = barHeight / 2;

  return (
    <g>
      <text
        x={LEFT_MARGIN + NODE_WIDTH + 10}
        y={y - 3}
        className="fill-foreground text-[11px] font-semibold"
      >
        {label}
      </text>
      <text
        x={LEFT_MARGIN + NODE_WIDTH + 10}
        y={y + 12}
        className="fill-muted-foreground text-[11px] tabular-nums"
      >
        {sublabel}
      </text>
    </g>
  );
};

const renderDestination = (destination: LaidOutNode, rightX: number) => {
  const centerY = (destination.top + destination.bottom) / 2;

  return (
    <g key={destination.id}>
      <rect
        x={rightX}
        y={destination.top}
        width={NODE_WIDTH}
        height={destination.bottom - destination.top}
        rx={2}
        fill={destination.color}
      />
      <text
        x={rightX - 10}
        y={centerY - 3}
        textAnchor="end"
        className="fill-foreground text-[11px] font-medium"
      >
        {destination.label}
      </text>
      <text
        x={rightX - 10}
        y={centerY + 12}
        textAnchor="end"
        className="fill-muted-foreground text-[10px] tabular-nums"
      >
        {destination.sublabel}
      </text>
    </g>
  );
};
