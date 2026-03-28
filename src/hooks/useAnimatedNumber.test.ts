import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnimatedNumber } from './useAnimatedNumber';

describe('useAnimatedNumber', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useAnimatedNumber(100));
    expect(result.current).toBe(100);
  });

  it('animates toward a new target', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedNumber(target),
      { initialProps: { target: 0 } },
    );

    expect(result.current).toBe(0);

    // Change target to 100
    rerender({ target: 100 });

    // Advance partway through animation (200ms of 400ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should be partially animated — not 0, not yet 100
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(100);
  });

  it('reaches the target after the animation completes', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedNumber(target),
      { initialProps: { target: 0 } },
    );

    rerender({ target: 250 });

    // Advance past the full animation duration
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(250);
  });

  it('animates downward when target decreases', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedNumber(target),
      { initialProps: { target: 200 } },
    );

    rerender({ target: 50 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should be between 50 and 200
    expect(result.current).toBeLessThan(200);
    expect(result.current).toBeGreaterThan(50);

    // Complete the animation
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(50);
  });

  it('handles rapid target changes', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedNumber(target),
      { initialProps: { target: 0 } },
    );

    // Change to 100
    rerender({ target: 100 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Change again to 500 mid-animation
    rerender({ target: 500 });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should reach the final target
    expect(result.current).toBe(500);
  });

  it('stays at zero when target is zero', () => {
    const { result } = renderHook(() => useAnimatedNumber(0));

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(0);
  });
});
