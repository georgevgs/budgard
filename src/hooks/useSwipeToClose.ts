import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

type UseSwipeToCloseOptions = {
  onClose: () => void;
  // Distance in pixels a slow drag must cover to dismiss.
  threshold?: number;
  // Allow disabling on desktop, where there is no sheet to drag.
  enabled?: boolean;
};

// How far the sheet can be pulled UP past its resting place before it stops
// moving entirely. It never actually reaches this — the resistance curve
// approaches it asymptotically, which is what makes the edge feel physical
// rather than like a wall.
const MAX_OVERPULL_PX = 72;
const OVERPULL_RESISTANCE = 0.55;

// A fast flick dismisses even if it never travelled the full threshold — the
// gesture people actually make is a short sharp flick, not a slow drag, and
// requiring distance alone made the sheet feel like it was ignoring them.
const FLICK_VELOCITY_PX_PER_MS = 0.5;
const FLICK_MIN_DISTANCE_RATIO = 0.25;

/**
 * Drag-to-dismiss for bottom-sheet modals. Downward movement tracks the finger
 * exactly, because that is a dismissal in progress and any lag reads as the
 * sheet fighting back. Upward movement is resisted instead of ignored: a sheet
 * that does not move at all when pulled feels broken, and a sheet that follows
 * freely implies it can go somewhere it cannot.
 */
export const useSwipeToClose = ({
  onClose,
  threshold = 100,
  enabled = true,
}: UseSwipeToCloseOptions) => {
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const startY = useRef(0);
  const lastY = useRef(0);
  const lastMoveAt = useRef(0);
  const velocity = useRef(0);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!enabled) {
        return;
      }

      // Only the handle and the header start a drag; the body has to stay
      // scrollable, and a form field must not become a dismissal target.
      const target = event.target as HTMLElement;
      const interactive = target.closest(
        'button, a, input, textarea, select, [role="button"], [role="menuitem"]',
      );
      if (interactive) {
        return;
      }

      const onHandle = target.closest('[data-drag-handle]');
      const onHeader = target.closest('[data-draggable-area]');
      if (!onHandle && !onHeader) {
        return;
      }

      startY.current = event.touches[0].clientY;
      lastY.current = startY.current;
      lastMoveAt.current = event.timeStamp;
      velocity.current = 0;
      setIsDragging(true);
    },
    [enabled],
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!isDragging || !enabled) {
        return;
      }

      const y = event.touches[0].clientY;
      const elapsed = event.timeStamp - lastMoveAt.current;
      if (elapsed > 0) {
        velocity.current = (y - lastY.current) / elapsed;
      }
      lastY.current = y;
      lastMoveAt.current = event.timeStamp;

      setTranslateY(resist(y - startY.current));
    },
    [isDragging, enabled],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !enabled) {
      return;
    }

    const dragged = translateY;
    const flicked =
      velocity.current > FLICK_VELOCITY_PX_PER_MS &&
      dragged > threshold * FLICK_MIN_DISTANCE_RATIO;

    setIsDragging(false);
    setTranslateY(0);

    if (dragged > threshold || flicked) {
      onClose();
    }
  }, [isDragging, enabled, translateY, threshold, onClose]);

  // Reset on unmount so a reopened sheet never starts mid-drag.
  useEffect(() => {
    return () => {
      setTranslateY(0);
      setIsDragging(false);
    };
  }, []);

  const settle = settleTransition(isDragging);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging,
    translateY,
    dragStyle: {
      transform: `translateY(${translateY}px)`,
      transition: settle.transform,
    },
    // The overlay thins out as the sheet leaves, so what is underneath comes
    // back gradually rather than all at once when the sheet finally closes.
    overlayStyle: {
      opacity: overlayOpacity(isDragging, translateY, threshold),
      transition: settle.opacity,
    },
  };
};

// --- Helpers ---

/**
 * iOS-style rubber band. Downward is a real dismissal, so it tracks 1:1.
 * Upward is resisted on a curve that approaches MAX_OVERPULL_PX without ever
 * reaching it, so the sheet always answers the finger but never pretends it
 * can travel further than it can.
 */
const resist = (delta: number): number => {
  if (delta >= 0) {
    return delta;
  }

  const overpull = -delta;
  const resisted =
    (overpull * MAX_OVERPULL_PX * OVERPULL_RESISTANCE) /
    (MAX_OVERPULL_PX + OVERPULL_RESISTANCE * overpull);

  return -resisted;
};

const overlayOpacity = (
  isDragging: boolean,
  translateY: number,
  threshold: number,
): number => {
  if (!isDragging) {
    return 1;
  }

  return Math.max(0.3, 1 - Math.max(translateY, 0) / (threshold * 2));
};

// While the finger is down there is no transition at all — the sheet is being
// directly manipulated and any easing would lag behind the touch. The settle
// afterwards is the only animated part, so that is the only part reduced
// motion needs to shorten.
const settleTransition = (isDragging: boolean) => {
  if (isDragging) {
    return { transform: 'none', opacity: 'none' };
  }

  if (prefersReducedMotion()) {
    return { transform: 'transform 0.01ms', opacity: 'opacity 0.01ms' };
  }

  return {
    // A slight overshoot on the way back reads as the sheet having weight.
    transform: 'transform 0.32s cubic-bezier(0.22, 1.2, 0.36, 1)',
    opacity: 'opacity 0.2s ease-out',
  };
};
