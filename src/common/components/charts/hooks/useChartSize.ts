import { useEffect, useRef, useState } from 'react';

// SVG cannot lay itself out against a percentage width the way a div can, so
// every chart needs its container measured first. ResizeObserver rather than a
// window resize listener: the dock, the drawer and the keyboard all change a
// chart's width without the window ever resizing.
export const useChartSize = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    // Measure synchronously on mount so the first paint is already the right
    // shape — waiting for the observer's first callback shows an empty frame.
    setWidth(element.clientWidth);

    if (typeof ResizeObserver !== 'function') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      // Sub-pixel changes fire constantly during a view transition and each
      // one would re-render every path in the chart.
      setWidth((previous) => {
        const next = entry.contentRect.width;
        if (Math.abs(next - previous) < 1) {
          return previous;
        }

        return next;
      });
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, width };
};
