import { useEffect, useRef, useState } from 'react';

const ANIMATION_DURATION_MS = 400;

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const useAnimatedNumber = (target: number): number => {
  const [display, setDisplay] = useState(target);
  const animationRef = useRef<number | null>(null);
  const startValueRef = useRef(target);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    startValueRef.current = display;
    startTimeRef.current = null;

    const animate = (timestamp: number): void => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
      const easedProgress = easeOutCubic(progress);

      const current =
        startValueRef.current +
        (target - startValueRef.current) * easedProgress;
      setDisplay(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
};
