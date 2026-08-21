import { useRef, useState } from 'react';
import { haptics } from '@/lib/haptics';

type Params = {
  // Revealed by dragging the row leftwards.
  onReveal?: () => void;
  enabled?: boolean;
};

// How far the row slides to expose the action behind it.
const ACTION_WIDTH = 88;
// Past this the row snaps open on release; short of it, it springs shut.
const OPEN_THRESHOLD = ACTION_WIDTH * 0.45;
// A drag has to be clearly horizontal before it takes over, or every attempt
// to scroll the list would drag a row sideways instead.
const DIRECTION_LOCK_PX = 10;

export type SwipeActions = {
  offset: number;
  isOpen: boolean;
  isDragging: boolean;
  close: () => void;
  handlers: {
    onTouchStart: (event: React.TouchEvent) => void;
    onTouchMove: (event: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
};

/**
 * Swipe a row left to reveal its actions. Reveal-then-tap rather than
 * swipe-to-act: the action behind these rows is destructive, and a gesture
 * that deletes the moment your thumb leaves the glass will eventually delete
 * something you meant to scroll past.
 */
export const useSwipeActions = ({ enabled = true }: Params = {}): SwipeActions => {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const start = useRef({ x: 0, y: 0 });
  const axis = useRef<'none' | 'horizontal' | 'vertical'>('none');
  const openedAt = useRef(0);

  const handlers = {
    onTouchStart: (event: React.TouchEvent) => {
      if (!enabled) {
        return;
      }
      const touch = event.touches[0];
      start.current = { x: touch.clientX, y: touch.clientY };
      axis.current = 'none';
      openedAt.current = offset;
    },

    onTouchMove: (event: React.TouchEvent) => {
      if (!enabled) {
        return;
      }
      const touch = event.touches[0];
      const dx = touch.clientX - start.current.x;
      const dy = touch.clientY - start.current.y;

      // Decide once which gesture this is, then stay with that decision — a
      // row that keeps re-testing jitters between scrolling and sliding.
      if (axis.current === 'none') {
        if (Math.abs(dy) > DIRECTION_LOCK_PX && Math.abs(dy) > Math.abs(dx)) {
          axis.current = 'vertical';

          return;
        }
        if (Math.abs(dx) > DIRECTION_LOCK_PX) {
          axis.current = 'horizontal';
          setIsDragging(true);
        } else {
          return;
        }
      }
      if (axis.current === 'vertical') {
        return;
      }

      setOffset(clampOffset(openedAt.current + dx));
    },

    onTouchEnd: () => {
      if (axis.current !== 'horizontal') {
        return;
      }
      axis.current = 'none';
      setIsDragging(false);
      setOffset((current) => settle(current));
    },
  };

  return {
    offset,
    isOpen: offset <= -OPEN_THRESHOLD,
    isDragging,
    close: () => setOffset(0),
    handlers,
  };
};

// --- Helpers ---

// Left travel stops at the width of the action. Rightward drag past the
// closed position does nothing — there is nothing revealed on that side.
const clampOffset = (value: number): number => {
  if (value > 0) {
    return 0;
  }

  return Math.max(value, -ACTION_WIDTH);
};

const settle = (current: number): number => {
  if (current <= -OPEN_THRESHOLD) {
    haptics.light();

    return -ACTION_WIDTH;
  }

  return 0;
};

export const SWIPE_ACTION_WIDTH = ACTION_WIDTH;
