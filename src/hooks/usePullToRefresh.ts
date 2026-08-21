import { useEffect, useRef, useState } from 'react';
import { haptics } from '@/lib/haptics';

type Options = {
  onRefresh: () => Promise<void>;
  // Off on desktop, and off while the app has nothing to refresh into.
  enabled?: boolean;
};

// The pull follows the finger exactly for the first few pixels and then eases
// off towards MAX_PULL_PX, which it approaches but never reaches. Tracking 1:1
// at the start is what makes the gesture feel picked up immediately; the ease
// afterwards is what stops the page feeling like it has come loose.
const MAX_PULL_PX = 160;
const TRIGGER_PX = 64;

export type PullToRefreshState = {
  // 0 while idle, growing to 1 at the point the gesture would trigger.
  progress: number;
  distance: number;
  isRefreshing: boolean;
  // True only while a finger is down. The shell tracks the finger exactly
  // during that time and eases back once it lifts, so the difference has to
  // be visible to the caller.
  isDragging: boolean;
};

/**
 * Pull down at the top of the page to refetch. Implemented with native
 * listeners rather than React's synthetic ones because React registers
 * `touchmove` as passive at the root, and a passive listener cannot call
 * preventDefault — without which iOS scrolls the page out from under the
 * gesture and the pull never gets a chance to start.
 */
export const usePullToRefresh = ({
  onRefresh,
  enabled = true,
}: Options): PullToRefreshState => {
  const [distance, setDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const tracking = useRef(false);
  const armed = useRef(false);
  // Read inside native listeners that are registered once, so they always see
  // the current callback without being torn down and re-added on every render.
  const refreshRef = useRef(onRefresh);
  const refreshingRef = useRef(false);

  useEffect(() => {
    refreshRef.current = onRefresh;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleStart = (event: TouchEvent) => {
      // Only from a genuine resting position at the top. Starting mid-scroll
      // would hijack a flick back to the top of a long list.
      if (window.scrollY > 0 || refreshingRef.current) {
        return;
      }
      startY.current = event.touches[0].clientY;
      tracking.current = true;
      armed.current = false;
      setIsDragging(true);
    };

    const handleMove = (event: TouchEvent) => {
      if (!tracking.current) {
        return;
      }

      const delta = event.touches[0].clientY - startY.current;
      if (delta <= 0) {
        // The finger went back up past the origin — this is a scroll, not a
        // pull. Hand it back rather than half-holding the gesture.
        tracking.current = false;
        setIsDragging(false);
        setDistance(0);

        return;
      }
      // The page would otherwise scroll under the gesture on iOS.
      if (event.cancelable) {
        event.preventDefault();
      }

      const pulled = resist(delta);
      setDistance(pulled);

      // One tick the moment it would fire, so the pull can be released by
      // feel without watching the indicator.
      if (pulled >= TRIGGER_PX && !armed.current) {
        armed.current = true;
        haptics.selection();
      }
      if (pulled < TRIGGER_PX) {
        armed.current = false;
      }
    };

    const handleEnd = () => {
      if (!tracking.current) {
        return;
      }
      tracking.current = false;
      setIsDragging(false);

      if (!armed.current) {
        setDistance(0);

        return;
      }

      armed.current = false;
      refreshingRef.current = true;
      setIsRefreshing(true);
      // Hold the indicator at the trigger point while the refetch runs, so it
      // reads as working rather than snapping back and leaving no trace.
      setDistance(TRIGGER_PX);

      void refreshRef
        .current()
        .catch(() => {
          // The data layer raises its own retry toast; the indicator's only
          // job is to stop.
        })
        .finally(() => {
          refreshingRef.current = false;
          setIsRefreshing(false);
          setDistance(0);
        });
    };

    document.addEventListener('touchstart', handleStart, { passive: true });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd, { passive: true });
    document.addEventListener('touchcancel', handleEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleStart);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
    };
  }, [enabled]);

  return {
    distance,
    progress: Math.min(distance / TRIGGER_PX, 1),
    isRefreshing,
    isDragging,
  };
};

// --- Helpers ---

// Slope 1 at the origin, asymptotic to MAX_PULL_PX. The hyperbolic curve this
// replaced resisted from the very first pixel, so a 140px drag yielded 40px of
// travel and the gesture could not physically reach its own trigger.
const resist = (delta: number): number => {
  return MAX_PULL_PX * (1 - Math.exp(-delta / MAX_PULL_PX));
};
