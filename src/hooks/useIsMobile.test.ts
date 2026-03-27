import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './useIsMobile';

describe('useIsMobile', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });
  });

  it('returns false on desktop-width viewport', () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true on mobile-width viewport', () => {
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('uses default breakpoint of 640px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 639, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);

    Object.defineProperty(window, 'innerWidth', { value: 640, configurable: true });
    const { result: result2 } = renderHook(() => useIsMobile());
    expect(result2.current).toBe(false);
  });

  it('accepts custom breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { value: 767, configurable: true });
    const { result } = renderHook(() => useIsMobile(768));
    expect(result.current).toBe(true);
  });

  it('updates on window resize', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(true);
  });
});
