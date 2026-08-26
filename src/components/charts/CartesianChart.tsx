import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  linearScale,
  niceMax,
  niceTicks,
  pointScale,
  bandScale,
} from '@/components/charts/chartScales';
import { XAxis, YAxis, ReferenceLine } from '@/components/charts/ChartAxes';
import { renderSeries } from '@/components/charts/ChartSeries';
import ChartLegend from '@/components/charts/ChartLegend';
import ChartHoverCard from '@/components/charts/ChartHoverCard';
import { useChartSize } from '@/components/charts/useChartSize';
import { useChartInteraction } from '@/components/charts/useChartInteraction';
import { buildPlot, seriesExtent } from '@/components/charts/chartLayout';
import type { CartesianChartProps } from '@/components/charts/chartTypes';

const DEFAULT_HEIGHT = 260;

// Every line, area and bar chart in the app. Hand-rolled rather than pulled
// from a library so the marks answer to the design tokens, the interaction is
// the same everywhere, and the whole thing costs a few kB instead of ~94.
const CartesianChart = (props: CartesianChartProps) => {
  const { ref, width } = useChartSize();
  const height = props.height ?? DEFAULT_HEIGHT;
  const hasBars = props.series.some((series) => series.kind === 'bar');

  const layout = useMemo(
    () => buildLayout(props, width, height),
    [props, width, height],
  );

  const interaction = useChartInteraction({
    count: props.data.length,
    plot: layout.plot,
    hasBars,
    onPointClick: props.onPointClick,
  });

  return (
    <div className={cn('relative w-full', props.className)} ref={ref}>
      {renderChart(props, layout, interaction, width, height, hasBars)}
      <ChartHoverCard
        activeIndex={interaction.activeIndex}
        data={props.data}
        x={activeX(props, layout, interaction.activeIndex, hasBars)}
        containerWidth={width}
        render={props.renderTooltip}
      />
      <ChartLegend series={props.series} show={props.showLegend} />
    </div>
  );
};

export default CartesianChart;

// --- Helpers ---

type Layout = ReturnType<typeof buildLayout>;
type Interaction = ReturnType<typeof useChartInteraction>;

const buildLayout = (
  props: CartesianChartProps,
  width: number,
  height: number,
) => {
  const extent = seriesExtent(props.data, props.series, props.allowNegative);
  const top = props.yMax ?? niceMax(extent.max);
  const plot = buildPlot(width, height, props.formatY, top);
  const y = linearScale(extent.min, top, plot.top + plot.height, plot.top);

  return { plot, y, ticks: niceTicks(top), min: extent.min };
};

const renderChart = (
  props: CartesianChartProps,
  layout: Layout,
  interaction: Interaction,
  width: number,
  height: number,
  hasBars: boolean,
) => {
  // Nothing can be positioned before the container has been measured. One
  // empty frame is better than a chart drawn at the wrong width and snapping.
  if (width === 0) {
    return <div style={{ height }} />;
  }

  const barCount = props.series.filter(
    (series) => series.kind === 'bar',
  ).length;
  const context = {
    data: props.data,
    plot: layout.plot,
    y: layout.y,
    activeIndex: interaction.activeIndex,
    hasBars,
    barCount,
  };

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={props.ariaLabel}
      className="overflow-visible"
    >
      <defs>{props.series.map(renderFillGradient)}</defs>
      <YAxis
        ticks={layout.ticks}
        y={layout.y}
        plot={layout.plot}
        format={props.formatY ?? String}
      />
      <XAxis
        data={props.data}
        xKey={props.xKey}
        plot={layout.plot}
        hasBars={hasBars}
        format={props.formatX}
      />
      {renderCursor(interaction.activeIndex, props, layout, hasBars)}
      {props.series.map(
        (series, index) =>
          renderSeries(series, barIndexOf(props, series.key), {
            ...context,
            barCount,
          }) ?? index,
      )}
      {renderReference(props, layout)}
      <rect
        x={layout.plot.left}
        y={layout.plot.top}
        width={layout.plot.width}
        height={layout.plot.height}
        fill="transparent"
        tabIndex={0}
        role="application"
        aria-label={props.ariaLabel}
        className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onPointerMove={interaction.handlePointerMove}
        onPointerLeave={interaction.handlePointerLeave}
        // Click is emitted after a tap, but cancelled when the same touch turns
        // into a page scroll. Pointer-down opened drill-down before that choice.
        onClick={interaction.handleClick}
        onKeyDown={interaction.handleKeyDown}
      />
    </svg>
  );
};

// Bars are laid out by their position among the bar series only, so a chart
// mixing two bars and a line does not leave a gap where the line "would" sit.
const barIndexOf = (props: CartesianChartProps, key: string): number => {
  return props.series
    .filter((series) => series.kind === 'bar')
    .findIndex((series) => series.key === key);
};

const renderFillGradient = (series: {
  key: string;
  color: string;
  kind: string;
}) => {
  if (series.kind !== 'area') {
    return null;
  }

  return (
    <linearGradient
      key={series.key}
      id={`chart-fill-${series.key}`}
      x1="0"
      y1="0"
      x2="0"
      y2="1"
    >
      <stop
        offset="0%"
        stopColor={`hsl(var(${series.color}))`}
        stopOpacity={0.34}
      />
      <stop
        offset="100%"
        stopColor={`hsl(var(${series.color}))`}
        stopOpacity={0.02}
      />
    </linearGradient>
  );
};

// A vertical rule under the pointer, so the eye can carry a value down to its
// label on a dense twelve-month axis. Bars get dimming instead (see
// ChartSeries) because a rule through a solid block reads as a defect.
const renderCursor = (
  activeIndex: number | null,
  props: CartesianChartProps,
  layout: Layout,
  hasBars: boolean,
) => {
  if (activeIndex === null || hasBars) {
    return null;
  }

  const x = pointScale(props.data.length, layout.plot).at(activeIndex);

  return (
    <line
      x1={x}
      x2={x}
      y1={layout.plot.top}
      y2={layout.plot.top + layout.plot.height}
      stroke="hsl(var(--border))"
      strokeWidth={1}
      strokeDasharray="4 4"
      aria-hidden="true"
    />
  );
};

const renderReference = (props: CartesianChartProps, layout: Layout) => {
  if (!props.reference) {
    return null;
  }

  return (
    <ReferenceLine marker={props.reference} y={layout.y} plot={layout.plot} />
  );
};

const activeX = (
  props: CartesianChartProps,
  layout: Layout,
  activeIndex: number | null,
  hasBars: boolean,
): number => {
  if (activeIndex === null) {
    return 0;
  }
  if (hasBars) {
    return bandScale(props.data.length, layout.plot).at(activeIndex);
  }

  return pointScale(props.data.length, layout.plot).at(activeIndex);
};
