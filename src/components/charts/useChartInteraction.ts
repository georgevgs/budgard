import { useState } from 'react';
import type {
  PointerEvent as ReactPointerEvent,
  MouseEvent as ReactMouseEvent,
  KeyboardEvent,
} from 'react';
import {
  bandScale,
  pointScale,
  type Plot,
} from '@/components/charts/chartScales';

type Params = {
  count: number;
  plot: Plot;
  hasBars: boolean;
  onPointClick?: (index: number) => void;
};

// Reading a chart is a pointer gesture on touch and a keyboard one on desktop,
// and both have to reach the same active index — a chart that only answers to
// a mouse is unusable for anyone who does not have one.
export const useChartInteraction = ({
  count,
  plot,
  hasBars,
  onPointClick,
}: Params) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const indexAt = (clientX: number, element: Element): number => {
    const bounds = element.getBoundingClientRect();
    const scale = hasBars ? bandScale(count, plot) : pointScale(count, plot);

    return scale.indexAt(clientX - bounds.left);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGRectElement>) => {
    setActiveIndex(indexAt(event.clientX, event.currentTarget));
  };

  const handlePointerLeave = () => {
    setActiveIndex(null);
  };

  const handleClick = (event: ReactMouseEvent<SVGRectElement>) => {
    if (!onPointClick) {
      return;
    }

    onPointClick(indexAt(event.clientX, event.currentTarget));
  };

  const handleKeyDown = (event: KeyboardEvent<SVGRectElement>) => {
    const next = nextIndex(event.key, activeIndex, count);
    if (next !== null) {
      event.preventDefault();
      setActiveIndex(next);

      return;
    }
    if (event.key === 'Escape') {
      setActiveIndex(null);

      return;
    }
    if (isSelectKey(event.key) && activeIndex !== null) {
      event.preventDefault();
      onPointClick?.(activeIndex);
    }
  };

  return {
    activeIndex,
    handlePointerMove,
    handlePointerLeave,
    handleClick,
    handleKeyDown,
  };
};

// --- Helpers ---

const isSelectKey = (key: string): boolean => {
  return key === 'Enter' || key === ' ';
};

// Returns null when the key is not a movement key, so the caller can deal with
// Escape and Enter without re-testing every arrow.
const nextIndex = (
  key: string,
  activeIndex: number | null,
  count: number,
): number | null => {
  if (count === 0) {
    return null;
  }
  if (key === 'ArrowRight') {
    if (activeIndex === null) {
      return 0;
    }

    return Math.min(activeIndex + 1, count - 1);
  }
  if (key === 'ArrowLeft') {
    if (activeIndex === null) {
      return count - 1;
    }

    return Math.max(activeIndex - 1, 0);
  }
  if (key === 'Home') {
    return 0;
  }
  if (key === 'End') {
    return count - 1;
  }

  return null;
};
