import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { prefersReducedMotion } from '@/constants/motion';

// Once a dismissal commits, finish it at a speed that feels connected to the
// release without letting a slow drag crawl or a fast flick disappear.
const MIN_DISMISS_DURATION_MS = 180;
const MAX_DISMISS_DURATION_MS = 320;
const MIN_DISMISS_VELOCITY_PX_PER_MS = 1;
const DISMISS_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const DISMISS_RESET_GRACE_MS = 50;

type UseSheetDismissalOptions = {
  onClose: () => void;
  // Returns the sheet to its resting position once a dismissal has finished or
  // been rejected. The drag half owns the transform, so it owns this.
  onSettled: () => void;
};

export type UseSheetDismissalReturn = {
  isDismissing: boolean;
  commit: (
    sheet: HTMLElement,
    dragged: number,
    releaseVelocity: number,
  ) => void;
  // Spread onto both the sheet and the overlay so they leave together.
  animation: Pick<
    CSSProperties,
    'animationDuration' | 'animationTimingFunction'
  >;
};

/**
 * What happens to a bottom sheet after the finger lets go and the close is
 * committed — split from useSwipeToClose because the two halves share nothing
 * but a release: that one decides whether the gesture was a dismissal, this
 * one carries it out.
 */
export const useSheetDismissal = ({
  onClose,
  onSettled,
}: UseSheetDismissalOptions): UseSheetDismissalReturn => {
  const [isDismissing, setIsDismissing] = useState(false);
  const [dismissDurationMs, setDismissDurationMs] = useState(
    MAX_DISMISS_DURATION_MS,
  );
  const rejectedDismissTimer = useRef<number | null>(null);
  const dismissalResetTimer = useRef<number | null>(null);
  const dismissingSheet = useRef<HTMLElement | null>(null);
  const dismissAnimationEnd = useRef<((event: AnimationEvent) => void) | null>(
    null,
  );

  const clearDismissalReset = useCallback(() => {
    clearTimer(dismissalResetTimer);

    if (dismissingSheet.current && dismissAnimationEnd.current) {
      dismissingSheet.current.removeEventListener(
        'animationend',
        dismissAnimationEnd.current,
      );
    }

    dismissingSheet.current = null;
    dismissAnimationEnd.current = null;
  }, []);

  const resetDismissal = useCallback(() => {
    clearDismissalReset();
    setIsDismissing(false);
    onSettled();
  }, [clearDismissalReset, onSettled]);

  const commit = useCallback(
    (sheet: HTMLElement, dragged: number, releaseVelocity: number) => {
      // Keep the exact release transform in place while Radix changes the
      // content to `data-state="closed"`. Its exit keyframe then interpolates
      // from this position to 100%, instead of snapping back to rest first.
      const sheetHeight = sheet.getBoundingClientRect().height;
      const duration = dismissDuration(sheetHeight, dragged, releaseVelocity);
      const handleDismissAnimationEnd = (animationEvent: AnimationEvent) => {
        if (
          animationEvent.target !== sheet ||
          sheet.dataset.state !== 'closed'
        ) {
          return;
        }

        resetDismissal();
      };

      clearDismissalReset();
      dismissingSheet.current = sheet;
      dismissAnimationEnd.current = handleDismissAnimationEnd;
      sheet.addEventListener('animationend', handleDismissAnimationEnd);
      setDismissDurationMs(duration);
      setIsDismissing(true);
      onClose();

      // A dirty-form guard can reject the close. Wait until React has flushed
      // the requested state change, then settle back only if the sheet stayed
      // open. A successful close keeps the release transform through unmount.
      clearTimer(rejectedDismissTimer);
      rejectedDismissTimer.current = window.setTimeout(() => {
        rejectedDismissTimer.current = null;

        if (!dismissingSheet.current) {
          return;
        }

        if (!sheet.isConnected || sheet.dataset.state === 'closed') {
          // DialogContent owns this hook while Radix mounts and unmounts the
          // portal content. Clear the release transform after the exit so a
          // later open starts at the sheet's resting position. animationend
          // is the exact path; the timer covers disabled or interrupted CSS.
          dismissalResetTimer.current = window.setTimeout(
            resetDismissal,
            duration + DISMISS_RESET_GRACE_MS,
          );

          return;
        }

        resetDismissal();
      }, 0);
    },
    [onClose, clearDismissalReset, resetDismissal],
  );

  // Do not leave the guarded-close check alive after the sheet unmounts.
  useEffect(() => {
    return () => {
      clearTimer(rejectedDismissTimer);
      clearDismissalReset();
    };
  }, [clearDismissalReset]);

  return {
    isDismissing,
    commit,
    animation: {
      animationDuration: whileDismissing(
        isDismissing,
        `${dismissDurationMs}ms`,
      ),
      animationTimingFunction: whileDismissing(isDismissing, DISMISS_EASING),
    },
  };
};

// Left unset unless a gesture dismissal is in flight, so a button or backdrop
// close keeps the sheet's normal exit.
const whileDismissing = (
  isDismissing: boolean,
  value: string,
): string | undefined => {
  if (!isDismissing) {
    return undefined;
  }

  return value;
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

const clearTimer = (timer: { current: number | null }) => {
  if (timer.current === null) {
    return;
  }

  window.clearTimeout(timer.current);
  timer.current = null;
};
