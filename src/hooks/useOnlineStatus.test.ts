import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';

describe('useOnlineStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true when browser is online', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('returns false when browser starts offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('goes offline after 3 second debounce', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Still online during debounce period
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current).toBe(false);
  });

  it('cancels offline debounce if back online quickly', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Come back online before 3s
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current).toBe(true);
  });

  it('goes online immediately without debounce', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    // Immediately online — no debounce
    expect(result.current).toBe(true);
  });
});
