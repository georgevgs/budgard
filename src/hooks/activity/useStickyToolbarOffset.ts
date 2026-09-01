import { useEffect, useRef, useState } from 'react';

// Activity's day-group headers stick just below this toolbar rather than
// behind it, so the current date stays legible while the list scrolls (see
// `.activity-day-header` in index.css). The offset is measured rather than
// guessed: the toolbar's own height moves with the locale (Greek labels wrap
// sooner than English ones) and with whether the month row is showing at
// all, so a hard-coded constant would drift out of sync with either.
export const useStickyToolbarOffset = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    // Measure synchronously on mount so the first paint already reserves the
    // right gap — waiting for the observer's first callback shows the day
    // header sitting under the toolbar for one frame.
    setHeight(element.getBoundingClientRect().height);

    if (typeof ResizeObserver !== 'function') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      // Sub-pixel changes fire constantly during a view transition and each
      // one would otherwise re-render the whole screen.
      setHeight((previous) => {
        const next = entry.target.getBoundingClientRect().height;
        if (Math.abs(next - previous) < 1) {
          return previous;
        }

        return next;
      });
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, height };
};
