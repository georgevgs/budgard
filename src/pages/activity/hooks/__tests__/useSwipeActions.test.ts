import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSwipeActions } from '@/pages/activity/hooks/useSwipeActions';

describe('useSwipeActions', () => {
  it('leaves vertical scrolling with the page', () => {
    const { result } = renderHook(() => useSwipeActions());

    act(() => result.current.handlers.onTouchStart(touchAt(100, 100)));
    act(() => result.current.handlers.onTouchMove(touchAt(104, 140)));
    act(() => result.current.handlers.onTouchEnd());

    expect(result.current.offset).toBe(0);
    expect(result.current.isDragging).toBe(false);
  });

  it('reveals the row after a committed horizontal swipe', () => {
    const { result } = renderHook(() => useSwipeActions());

    act(() => result.current.handlers.onTouchStart(touchAt(100, 100)));
    act(() => result.current.handlers.onTouchMove(touchAt(40, 103)));
    act(() => result.current.handlers.onTouchEnd());

    expect(result.current.offset).toBe(-88);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.isDragging).toBe(false);
  });

  it('restores a closed row when the gesture is cancelled', () => {
    const { result } = renderHook(() => useSwipeActions());

    act(() => result.current.handlers.onTouchStart(touchAt(100, 100)));
    act(() => result.current.handlers.onTouchMove(touchAt(60, 102)));
    expect(result.current.offset).toBe(-40);
    expect(result.current.isDragging).toBe(true);

    act(() => result.current.handlers.onTouchCancel());

    expect(result.current.offset).toBe(0);
    expect(result.current.isDragging).toBe(false);
  });

  it('does not reveal Delete during a two-finger gesture', () => {
    const { result } = renderHook(() => useSwipeActions());

    act(() => result.current.handlers.onTouchStart(touchAt(100, 100, 2)));
    act(() => result.current.handlers.onTouchMove(touchAt(40, 103, 2)));
    act(() => result.current.handlers.onTouchEnd());

    expect(result.current.offset).toBe(0);
    expect(result.current.isOpen).toBe(false);
  });

  it('cancels a row drag when a second finger joins and ignores the remaining finger', () => {
    const { result } = renderHook(() => useSwipeActions());

    act(() => result.current.handlers.onTouchStart(touchAt(100, 100)));
    act(() => result.current.handlers.onTouchMove(touchAt(40, 103)));
    act(() => result.current.handlers.onTouchStart(touchAt(40, 103, 2)));
    act(() => result.current.handlers.onTouchMove(touchAt(10, 103)));
    act(() => result.current.handlers.onTouchEnd());

    expect(result.current.offset).toBe(0);
    expect(result.current.isDragging).toBe(false);
  });
});

const touchAt = (clientX: number, clientY: number, count = 1) => {
  return {
    touches: Array.from({ length: count }, () => ({ clientX, clientY })),
  } as unknown as React.TouchEvent;
};
