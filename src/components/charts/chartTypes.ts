import type { ReactNode } from 'react';

// Every chart in the app is described by this shape. Colours are named by the
// design token they come from — `'--primary'`, never a hue — so a repalette
// moves the charts with the rest of the UI (see src/design/tokens.ts).
export type TokenName = string;

export type ChartPoint = Record<string, string | number | null | undefined>;

export type SeriesKind = 'area' | 'line' | 'bar';

export type Series = {
  kind: SeriesKind;
  // Key into each ChartPoint holding this series' value.
  key: string;
  // Legend and screen-reader name.
  label: string;
  color: TokenName;
  // Lines only: draws dashed, for a projection or a cost basis — something
  // that is modelled rather than measured.
  dashed?: boolean;
  // Areas and lines only. Off for a step-like series where a curve would
  // invent motion between two readings that never happened.
  smooth?: boolean;
  // Areas only: skip the gradient and draw the stroke alone.
  fill?: boolean;
};

export type ReferenceMarker = {
  value: number;
  label?: string;
  color?: TokenName;
};

export type CartesianChartProps = {
  data: ChartPoint[];
  // Key into each ChartPoint holding its x-axis label.
  xKey: string;
  series: Series[];
  height?: number;
  // Forces the top of the y axis. Without it the axis fits the data.
  yMax?: number;
  // Allows the y axis to run below zero, for a net figure that can be negative.
  allowNegative?: boolean;
  formatY?: (value: number) => string;
  formatX?: (value: string, index: number) => string;
  reference?: ReferenceMarker;
  renderTooltip?: (point: ChartPoint, index: number) => ReactNode;
  onPointClick?: (index: number) => void;
  showLegend?: boolean;
  // Sentence describing the chart for anyone who cannot see it. Required —
  // an unlabelled chart is invisible to a screen reader, not merely awkward.
  ariaLabel: string;
  className?: string;
};
