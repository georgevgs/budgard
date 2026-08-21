import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

// Tuned to settle in roughly a third of a second with no visible bounce. A
// figure that overshoots reads as the app being unsure what the number is.
const STIFFNESS = 210;
const DAMPING = 26;
const MASS = 1;

// Below this the remaining distance is under a hundredth of a cent and the
// velocity is spent, so continuing would burn frames on nothing.
const REST_DISTANCE = 0.01;
const REST_VELOCITY = 0.01;

// Integration is capped so a backgrounded tab returning with a 4-second gap
// steps the spring forward sanely instead of exploding.
const MAX_FRAME_SECONDS = 1 / 30;

/**
 * Counts a figure up or down to its new value.
 *
 * A spring rather than a fixed-duration ease because it is interruptible: when
 * a second change lands mid-flight — two expenses added in quick succession —
 * the motion carries its current velocity into the new target instead of
 * restarting from a standstill, which is what made the old easing stutter.
 */
export const useAnimatedNumber = (target: number): number => {
  const [display, setDisplay] = useState(target);
  const frameRef = useRef<number | null>(null);
  const valueRef = useRef(target);
  const velocityRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    // The value is information, not decoration — it still has to arrive, it
    // just arrives at once. Scheduled rather than set inline: a synchronous
    // setState in an effect body cascades an extra render pass.
    if (prefersReducedMotion()) {
      valueRef.current = target;
      velocityRef.current = 0;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        setDisplay(target);
      });

      return () => {
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
      };
    }

    lastTimeRef.current = null;

    const step = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const seconds = Math.min(
        (timestamp - lastTimeRef.current) / 1000,
        MAX_FRAME_SECONDS,
      );
      lastTimeRef.current = timestamp;

      const displacement = valueRef.current - target;
      const acceleration =
        (-STIFFNESS * displacement - DAMPING * velocityRef.current) / MASS;

      velocityRef.current += acceleration * seconds;
      valueRef.current += velocityRef.current * seconds;

      if (isAtRest(valueRef.current, target, velocityRef.current)) {
        valueRef.current = target;
        velocityRef.current = 0;
        frameRef.current = null;
        setDisplay(target);

        return;
      }

      setDisplay(valueRef.current);
      frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [target]);

  return display;
};

// --- Helpers ---

const isAtRest = (
  value: number,
  target: number,
  velocity: number,
): boolean => {
  return (
    Math.abs(value - target) < REST_DISTANCE && Math.abs(velocity) < REST_VELOCITY
  );
};
