import { useEffect, useRef, useState } from 'react';

type Options = {
  delayMs?: number;
  minDurationMs?: number;
};

// Nothing is shown for the first `delayMs`, so a load that finishes quickly
// never flashes a placeholder — a skeleton that appears for 80ms reads as a
// rendering glitch rather than as progress. Once it does appear it stays up
// for at least `minDurationMs`, so it can't strobe off a frame later either.
// The defaults follow the eBay design system: roughly half a second of wait
// is the point where a placeholder starts helping instead of distracting.
export const DEFAULT_LOADING_DELAY_MS = 200;
const DEFAULT_MIN_DURATION_MS = 400;

export const useDelayedLoading = (
  isLoading: boolean,
  options: Options = {},
): boolean => {
  const {
    delayMs = DEFAULT_LOADING_DELAY_MS,
    minDurationMs = DEFAULT_MIN_DURATION_MS,
  } = options;
  const [isVisible, setIsVisible] = useState(false);
  // When the placeholder actually went on screen, or null while it is hidden.
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      const showTimer = window.setTimeout(() => {
        shownAtRef.current = Date.now();
        setIsVisible(true);
      }, delayMs);

      return () => window.clearTimeout(showTimer);
    }

    // Loading finished before the delay elapsed — nothing was ever shown, so
    // there is no minimum to honour.
    if (shownAtRef.current === null) {
      setIsVisible(false);

      return;
    }

    const remaining = minDurationMs - (Date.now() - shownAtRef.current);

    if (remaining <= 0) {
      shownAtRef.current = null;
      setIsVisible(false);

      return;
    }

    const hideTimer = window.setTimeout(() => {
      shownAtRef.current = null;
      setIsVisible(false);
    }, remaining);

    return () => window.clearTimeout(hideTimer);
  }, [isLoading, delayMs, minDurationMs]);

  return isVisible;
};
