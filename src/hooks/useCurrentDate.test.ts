import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getNextRefreshDelay, useCurrentDate } from '@/hooks/useCurrentDate';

describe('useCurrentDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refreshes at the next greeting boundary', () => {
    vi.setSystemTime(new Date(2026, 7, 26, 11, 59, 0));
    const { result } = renderHook(() => useCurrentDate());

    act(() => vi.advanceTimersByTime(60_000));

    expect(result.current.getHours()).toBe(12);
  });

  it('advances to the next local day at midnight', () => {
    vi.setSystemTime(new Date(2026, 7, 26, 23, 59, 59));
    const { result } = renderHook(() => useCurrentDate());

    act(() => vi.advanceTimersByTime(1_000));

    expect(result.current.getDate()).toBe(27);
  });

  it('refreshes when the app returns to the foreground', () => {
    vi.setSystemTime(new Date(2026, 7, 26, 10, 0, 0));
    const { result } = renderHook(() => useCurrentDate());
    vi.setSystemTime(new Date(2026, 7, 27, 9, 0, 0));

    act(() => document.dispatchEvent(new Event('visibilitychange')));

    expect(result.current.getDate()).toBe(27);
  });
});

describe('getNextRefreshDelay', () => {
  it('uses local calendar boundaries across the day', () => {
    const morning = new Date(2026, 7, 26, 9, 0, 0);
    const afternoon = new Date(2026, 7, 26, 14, 0, 0);
    const evening = new Date(2026, 7, 26, 20, 0, 0);

    expect(getNextRefreshDelay(morning)).toBe(3 * 60 * 60 * 1_000);
    expect(getNextRefreshDelay(afternoon)).toBe(4 * 60 * 60 * 1_000);
    expect(getNextRefreshDelay(evening)).toBe(4 * 60 * 60 * 1_000);
  });
});
