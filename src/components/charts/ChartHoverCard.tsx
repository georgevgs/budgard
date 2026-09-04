import type { ReactNode } from 'react';
import type { ChartPoint } from '@/components/charts/chartTypes';

type Props = {
  activeIndex: number | null;
  data: ChartPoint[];
  // Pixel position of the active point, so the card can follow it.
  x: number;
  containerWidth: number;
  render?: (point: ChartPoint, index: number) => ReactNode;
};

const CARD_WIDTH = 168;
const EDGE_GUTTER = 4;

// Rendered as HTML above the SVG rather than as <foreignObject> inside it:
// text stays crisp, the shared surface tokens apply unchanged, and the card
// can overflow the plot without being clipped by the viewBox.
const ChartHoverCard = ({
  activeIndex,
  data,
  x,
  containerWidth,
  render,
}: Props) => {
  if (activeIndex === null || !render) {
    return null;
  }

  const point = data[activeIndex];
  if (!point) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute top-0 z-10 w-[168px]"
      style={{ left: clampToContainer(x, containerWidth) }}
    >
      <div className="chart-tooltip">{render(point, activeIndex)}</div>
    </div>
  );
};

export default ChartHoverCard;

// --- Helpers ---

// Centres the card on the point, then pulls it back inside the chart so it
// never hangs off the screen edge on a phone.
const clampToContainer = (x: number, containerWidth: number): number => {
  const ideal = x - CARD_WIDTH / 2;
  const furthest = containerWidth - CARD_WIDTH - EDGE_GUTTER;

  return Math.max(
    EDGE_GUTTER,
    Math.min(ideal, Math.max(furthest, EDGE_GUTTER)),
  );
};
