import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { prefersReducedMotion } from '@/constants/motion';
import { useSheetDismissal } from '@/common/hooks/useSheetDismissal';

type UseSwipeToCloseOptions = {
  onClose: () => void;
  // Distance in pixels a slow drag must cover to dismiss.
  threshold?: number;
  // Allow disabling on desktop, where there is no sheet to drag.
  isEnabled?: boolean;
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
const MAX_FLICK_PAUSE_MS = 100;

type DragStyle = CSSProperties & {
  '--tw-exit-opacity'?: string;
};

/**
 * Drag-to-dismiss for bottom-sheet modals. Downward movement tracks the finger
 * exactly, because that is a dismissal in progress and any lag reads as the
 * sheet fighting back. Upward movement is resisted instead of ignored: a sheet
 * that does not move at all when pulled feels broken, and a sheet that follows
 * freely implies it can go somewhere it cannot.
 *
 * This half owns the finger and the transform. Everything after the release is
 * committed belongs to useSheetDismissal.
 */
export const useSwipeToClose = ({
  onClose,
  threshold = 100,
  isEnabled = true,
}: UseSwipeToCloseOptions) => {
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const startY = useRef(0);
  const lastY = useRef(0);
  const lastMoveAt = useRef(0);
  const velocity = useRef(0);

  const settle = useCallback(() => setTranslateY(0), []);
  const {
    isDismissing,
    commit: commitDismissal,
    animation,
  } = useSheetDismissal({ onClose, onSettled: settle });

  const cancelDrag = useCallback(() => {
    velocity.current = 0;
    setIsDragging(false);
    setTranslateY(0);
  }, []);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!isEnabled || isDismissing) {
        return;
      }
      if (event.touches.length !== 1) {
        cancelDrag();

        return;
      }
      if (!isDragTarget(event.target as HTMLElement)) {
        return;
      }

      startY.current = event.touches[0].clientY;
      lastY.current = startY.current;
      lastMoveAt.current = event.timeStamp;
      velocity.current = 0;
      setIsDragging(true);
    },
    [isEnabled, isDismissing, cancelDrag],
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!isDragging || !isEnabled) {
        return;
      }
      if (event.touches.length !== 1) {
        cancelDrag();

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
    [isDragging, isEnabled, cancelDrag],
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (!isDragging || !isEnabled) {
        return;
      }

      const dragged = translateY;
      // Holding a short drag still before letting go cancels the flick.
      if (event.timeStamp - lastMoveAt.current > MAX_FLICK_PAUSE_MS) {
        velocity.current = 0;
      }
      const flicked =
        velocity.current > FLICK_VELOCITY_PX_PER_MS &&
        dragged > threshold * FLICK_MIN_DISTANCE_RATIO;

      setIsDragging(false);

      if (dragged <= threshold && !flicked) {
        setTranslateY(0);

        return;
      }

      commitDismissal(event.currentTarget, dragged, velocity.current);
    },
    [isDragging, isEnabled, translateY, threshold, commitDismissal],
  );

  // React's content handlers only receive the normal touch end. If the browser
  // or OS cancels the gesture, recover at the document boundary so a sheet
  // cannot remain halfway down the screen with its transition disabled.
  useEffect(() => {
    if (!isDragging) {
      return;
    }

    document.addEventListener('touchcancel', cancelDrag, {
      passive: true,
    });

    return () => document.removeEventListener('touchcancel', cancelDrag);
  }, [isDragging, cancelDrag]);

  const isInteractionActive = isDragging || isDismissing;
  const settleStyle = settleTransition(isInteractionActive);
  const dragStyle: DragStyle = {
    transform: `translateY(${translateY}px)`,
    transition: settleStyle.transform,
    ...animation,
    '--tw-exit-opacity': exitOpacity(isDismissing),
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging,
    isDismissing,
    translateY,
    dragStyle,
    // The overlay thins out as the sheet leaves, so what is underneath comes
    // back gradually rather than all at once when the sheet finally closes.
    overlayStyle: {
      opacity: overlayOpacity(isInteractionActive, translateY, threshold),
      transition: settleStyle.opacity,
      ...animation,
    },
  };
};

// Only the handle and the header start a drag; the body has to stay scrollable,
// and a form field must not become a dismissal target.
const isDragTarget = (target: HTMLElement): boolean => {
  const interactive = target.closest(
    'button, a, input, textarea, select, [role="button"], [role="menuitem"]',
  );
  if (interactive) {
    return false;
  }

  return Boolean(
    target.closest('[data-drag-handle]') ||
    target.closest('[data-draggable-area]'),
  );
};

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
  isInteractionActive: boolean,
  translateY: number,
  threshold: number,
): number => {
  if (!isInteractionActive) {
    return 1;
  }

  return Math.max(0.3, 1 - Math.max(translateY, 0) / (threshold * 2));
};

// While the finger is down there is no transition at all — the sheet is being
// directly manipulated and any easing would lag behind the touch. A committed
// dismissal also leaves transitions off because the Radix exit keyframe owns
// that phase. The rejected-drag settle is the only transition here.
const settleTransition = (isInteractionActive: boolean) => {
  if (isInteractionActive) {
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

// The sheet itself stays solid while leaving; the separate overlay owns the
// fade. This inline Tailwind animation variable only applies to a gesture
// dismissal, so button and backdrop closes retain their normal fade.
const exitOpacity = (isDismissing: boolean): string | undefined => {
  if (!isDismissing) {
    return undefined;
  }

  return '1';
};
