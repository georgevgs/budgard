import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
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

// Once a dismissal commits, finish it at a speed that feels connected to the
// release without letting a slow drag crawl or a fast flick disappear.
const MIN_DISMISS_DURATION_MS = 180;
const MAX_DISMISS_DURATION_MS = 320;
const MIN_DISMISS_VELOCITY_PX_PER_MS = 1;
const DISMISS_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';

type DragStyle = CSSProperties & {
  '--tw-exit-opacity'?: string;
};

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
  const [isDismissing, setIsDismissing] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const [dismissDurationMs, setDismissDurationMs] = useState(
    MAX_DISMISS_DURATION_MS,
  );
  const startY = useRef(0);
  const lastY = useRef(0);
  const lastMoveAt = useRef(0);
  const velocity = useRef(0);
  const rejectedDismissTimer = useRef<number | null>(null);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!enabled || isDismissing) {
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
    [enabled, isDismissing],
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

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (!isDragging || !enabled) {
        return;
      }

      const dragged = translateY;
      const flicked =
        velocity.current > FLICK_VELOCITY_PX_PER_MS &&
        dragged > threshold * FLICK_MIN_DISTANCE_RATIO;

      setIsDragging(false);

      if (dragged <= threshold && !flicked) {
        setTranslateY(0);

        return;
      }

      // Keep the exact release transform in place while Radix changes the
      // content to `data-state="closed"`. Its exit keyframe then interpolates
      // from this position to 100%, instead of snapping back to rest first.
      const sheet = event.currentTarget;
      const sheetHeight = sheet.getBoundingClientRect().height;
      setDismissDurationMs(
        dismissDuration(sheetHeight, dragged, velocity.current),
      );
      setIsDismissing(true);
      onClose();

      // A dirty-form guard can reject the close. Wait until React has flushed
      // the requested state change, then settle back only if the sheet stayed
      // open. A successful close keeps the release transform through unmount.
      clearRejectedDismissTimer(rejectedDismissTimer);
      rejectedDismissTimer.current = window.setTimeout(() => {
        rejectedDismissTimer.current = null;

        if (!sheet.isConnected || sheet.dataset.state === 'closed') {
          return;
        }

        setIsDismissing(false);
        setTranslateY(0);
      }, 0);
    },
    [isDragging, enabled, translateY, threshold, onClose],
  );

  // React's content handlers only receive the normal touch end. If the browser
  // or OS cancels the gesture, recover at the document boundary so a sheet
  // cannot remain halfway down the screen with its transition disabled.
  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handleTouchCancel = () => {
      velocity.current = 0;
      setIsDragging(false);
      setTranslateY(0);
    };

    document.addEventListener('touchcancel', handleTouchCancel, {
      passive: true,
    });

    return () => document.removeEventListener('touchcancel', handleTouchCancel);
  }, [isDragging]);

  // Do not leave the guarded-close check alive after the sheet unmounts.
  useEffect(() => {
    return () => {
      clearRejectedDismissTimer(rejectedDismissTimer);
    };
  }, []);

  const interactionActive = isDragging || isDismissing;
  const settle = settleTransition(interactionActive);
  const dragStyle: DragStyle = {
    transform: `translateY(${translateY}px)`,
    transition: settle.transform,
    animationDuration: dismissAnimationDuration(
      isDismissing,
      dismissDurationMs,
    ),
    animationTimingFunction: dismissAnimationEasing(isDismissing),
    // The sheet itself stays solid while leaving; the separate overlay owns
    // the fade. This inline Tailwind animation variable only applies to a
    // gesture dismissal, so button/backdrop closes retain their normal fade.
    '--tw-exit-opacity': dismissExitOpacity(isDismissing),
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
      opacity: overlayOpacity(interactionActive, translateY, threshold),
      transition: settle.opacity,
      animationDuration: dismissAnimationDuration(
        isDismissing,
        dismissDurationMs,
      ),
      animationTimingFunction: dismissAnimationEasing(isDismissing),
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
  interactionActive: boolean,
  translateY: number,
  threshold: number,
): number => {
  if (!interactionActive) {
    return 1;
  }

  return Math.max(0.3, 1 - Math.max(translateY, 0) / (threshold * 2));
};

// While the finger is down there is no transition at all — the sheet is being
// directly manipulated and any easing would lag behind the touch. A committed
// dismissal also leaves transitions off because the Radix exit keyframe owns
// that phase. The rejected-drag settle is the only transition here.
const settleTransition = (interactionActive: boolean) => {
  if (interactionActive) {
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

const dismissDuration = (
  sheetHeight: number,
  translateY: number,
  releaseVelocity: number,
): number => {
  if (prefersReducedMotion()) {
    return 0.01;
  }

  const remainingDistance = Math.max(sheetHeight - Math.max(translateY, 0), 0);
  const finishVelocity = Math.max(
    releaseVelocity,
    MIN_DISMISS_VELOCITY_PX_PER_MS,
  );
  const projectedDuration = Math.round(remainingDistance / finishVelocity);

  return Math.min(
    MAX_DISMISS_DURATION_MS,
    Math.max(MIN_DISMISS_DURATION_MS, projectedDuration),
  );
};

const dismissAnimationDuration = (
  isDismissing: boolean,
  durationMs: number,
): string | undefined => {
  if (!isDismissing) {
    return undefined;
  }

  return `${durationMs}ms`;
};

const dismissAnimationEasing = (isDismissing: boolean): string | undefined => {
  if (!isDismissing) {
    return undefined;
  }

  return DISMISS_EASING;
};

const dismissExitOpacity = (isDismissing: boolean): string | undefined => {
  if (!isDismissing) {
    return undefined;
  }

  return '1';
};

const clearRejectedDismissTimer = (
  timer: React.MutableRefObject<number | null>,
) => {
  if (timer.current === null) {
    return;
  }

  window.clearTimeout(timer.current);
  timer.current = null;
};
