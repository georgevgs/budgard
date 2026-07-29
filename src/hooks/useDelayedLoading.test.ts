import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';

const OPTIONS = { delayMs: 200, minDurationMs: 400 };

describe('useDelayedLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows nothing for the first delay window', () => {
    const { result } = renderHook(() => useDelayedLoading(true, OPTIONS));

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it('never shows a placeholder for a load that beats the delay', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useDelayedLoading(isLoading, OPTIONS),
      { initialProps: { isLoading: true } },
    );

    act(() => {
      vi.advanceTimersByTime(120);
    });
    rerender({ isLoading: false });

    expect(result.current).toBe(false);

    // The pending show-timer must have been cleared, not merely ignored.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(false);
  });

  it('holds a shown placeholder for the minimum duration', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useDelayedLoading(isLoading, OPTIONS),
      { initialProps: { isLoading: true } },
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(true);

    // Data lands 50ms after the placeholder appeared — it must not blink out.
    act(() => {
      vi.advanceTimersByTime(50);
    });
    rerender({ isLoading: false });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(349);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it('hides immediately when the minimum has already elapsed', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useDelayedLoading(isLoading, OPTIONS),
      { initialProps: { isLoading: true } },
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(result.current).toBe(true);

    rerender({ isLoading: false });
    expect(result.current).toBe(false);
  });

  it('re-arms the delay when loading starts again', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useDelayedLoading(isLoading, OPTIONS),
      { initialProps: { isLoading: true } },
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });
    rerender({ isLoading: false });
    expect(result.current).toBe(false);

    rerender({ isLoading: true });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(true);
  });

  it('stays hidden while never loading', () => {
    const { result } = renderHook(() => useDelayedLoading(false, OPTIONS));

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(false);
  });
});
