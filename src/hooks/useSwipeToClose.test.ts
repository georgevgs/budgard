import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';

const makeTouchEvent = (
  clientY: number,
  target?: Partial<HTMLElement>,
  timeStamp = 0,
) => {
  const el = {
    closest: vi.fn((selector: string) => {
      if (selector === '[data-drag-handle]')
        return target?.dataset?.dragHandle ? el : null;
      if (selector === '[data-draggable-area]')
        return target?.dataset?.draggableArea ? el : null;
      if (selector.startsWith('button'))
        return target?.dataset?.interactive ? el : null;

      return null;
    }),
    dataset: {},
    ...target,
  };

  return {
    touches: [{ clientY }],
    target: el as unknown as EventTarget,
    timeStamp,
  } as unknown as React.TouchEvent;
};

describe('useSwipeToClose', () => {
  it('returns initial state with no dragging', () => {
    const { result } = renderHook(() => useSwipeToClose({ onClose: vi.fn() }));

    expect(result.current.isDragging).toBe(false);
    expect(result.current.translateY).toBe(0);
  });

  it('starts dragging on drag handle touch', () => {
    const { result } = renderHook(() => useSwipeToClose({ onClose: vi.fn() }));

    act(() => {
      result.current.handleTouchStart(
        makeTouchEvent(100, {
          dataset: { dragHandle: 'true' },
        } as unknown as Partial<HTMLElement>),
      );
    });

    expect(result.current.isDragging).toBe(true);
  });

  it('does not start dragging on non-handle elements', () => {
    const { result } = renderHook(() => useSwipeToClose({ onClose: vi.fn() }));

    act(() => {
      result.current.handleTouchStart(makeTouchEvent(100));
    });

    expect(result.current.isDragging).toBe(false);
  });

  it('does not start dragging from a control inside a draggable header', () => {
    const { result } = renderHook(() => useSwipeToClose({ onClose: vi.fn() }));

    act(() => {
      result.current.handleTouchStart(
        makeTouchEvent(100, {
          dataset: { draggableArea: 'true', interactive: 'true' },
        } as unknown as Partial<HTMLElement>),
      );
    });

    expect(result.current.isDragging).toBe(false);
  });

  it('tracks downward movement', () => {
    const { result } = renderHook(() =>
      useSwipeToClose({ onClose: vi.fn(), threshold: 100 }),
    );

    act(() => {
      result.current.handleTouchStart(
        makeTouchEvent(100, {
          dataset: { dragHandle: 'true' },
        } as unknown as Partial<HTMLElement>),
      );
    });
    act(() => {
      result.current.handleTouchMove(makeTouchEvent(150));
    });

    expect(result.current.translateY).toBe(50);
  });

  // A sheet that does not move at all when pulled up reads as broken, so the
  // gesture is resisted rather than ignored — it answers, but barely.
  it('resists upward movement instead of ignoring it', () => {
    const { result } = renderHook(() => useSwipeToClose({ onClose: vi.fn() }));

    act(() => {
      result.current.handleTouchStart(
        makeTouchEvent(100, {
          dataset: { dragHandle: 'true' },
        } as unknown as Partial<HTMLElement>),
      );
    });
    act(() => {
      result.current.handleTouchMove(makeTouchEvent(50));
    });

    expect(result.current.translateY).toBeLessThan(0);
    // 50px of pull yields far less than 50px of movement.
    expect(result.current.translateY).toBeGreaterThan(-25);
  });

  it('never lets the over-pull run away, however far it is dragged', () => {
    const { result } = renderHook(() => useSwipeToClose({ onClose: vi.fn() }));

    act(() => {
      result.current.handleTouchStart(
        makeTouchEvent(500, {
          dataset: { dragHandle: 'true' },
        } as unknown as Partial<HTMLElement>),
      );
    });
    act(() => {
      result.current.handleTouchMove(makeTouchEvent(0));
    });

    expect(result.current.translateY).toBeGreaterThan(-72);
  });

  // The gesture people actually make is a short sharp flick, not a slow drag.
  it('dismisses on a fast flick that never reached the threshold', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useSwipeToClose({ onClose, threshold: 100 }),
    );

    act(() => {
      result.current.handleTouchStart(
        makeTouchEvent(
          100,
          {
            dataset: { dragHandle: 'true' },
          } as unknown as Partial<HTMLElement>,
          0,
        ),
      );
    });
    act(() => {
      result.current.handleTouchMove(makeTouchEvent(160, undefined, 40));
    });
    act(() => {
      result.current.handleTouchEnd();
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('ignores a slow drag of the same distance', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useSwipeToClose({ onClose, threshold: 100 }),
    );

    act(() => {
      result.current.handleTouchStart(
        makeTouchEvent(
          100,
          {
            dataset: { dragHandle: 'true' },
          } as unknown as Partial<HTMLElement>,
          0,
        ),
      );
    });
    act(() => {
      result.current.handleTouchMove(makeTouchEvent(160, undefined, 900));
    });
    act(() => {
      result.current.handleTouchEnd();
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when swiped past threshold', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useSwipeToClose({ onClose, threshold: 50 }),
    );

    act(() => {
      result.current.handleTouchStart(
        makeTouchEvent(100, {
          dataset: { dragHandle: 'true' },
        } as unknown as Partial<HTMLElement>),
      );
    });
    act(() => {
      result.current.handleTouchMove(makeTouchEvent(200));
    });
    act(() => {
      result.current.handleTouchEnd();
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when swipe is below threshold', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useSwipeToClose({ onClose, threshold: 100 }),
    );

    act(() => {
      result.current.handleTouchStart(
        makeTouchEvent(100, {
          dataset: { dragHandle: 'true' },
        } as unknown as Partial<HTMLElement>),
      );
    });
    act(() => {
      result.current.handleTouchMove(makeTouchEvent(150));
    });
    act(() => {
      result.current.handleTouchEnd();
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('resets translateY after touch end', () => {
    const { result } = renderHook(() =>
      useSwipeToClose({ onClose: vi.fn(), threshold: 200 }),
    );

    act(() => {
      result.current.handleTouchStart(
        makeTouchEvent(100, {
          dataset: { dragHandle: 'true' },
        } as unknown as Partial<HTMLElement>),
      );
    });
    act(() => {
      result.current.handleTouchMove(makeTouchEvent(150));
    });
    act(() => {
      result.current.handleTouchEnd();
    });

    expect(result.current.translateY).toBe(0);
    expect(result.current.isDragging).toBe(false);
  });

  it('restores the sheet when the browser cancels the gesture', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useSwipeToClose({ onClose }));

    act(() => {
      result.current.handleTouchStart(
        makeTouchEvent(100, {
          dataset: { dragHandle: 'true' },
        } as unknown as Partial<HTMLElement>),
      );
    });
    act(() => result.current.handleTouchMove(makeTouchEvent(160)));
    expect(result.current.translateY).toBe(60);

    act(() => document.dispatchEvent(new TouchEvent('touchcancel')));

    expect(result.current.translateY).toBe(0);
    expect(result.current.isDragging).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const { result } = renderHook(() =>
      useSwipeToClose({ onClose: vi.fn(), enabled: false }),
    );

    act(() => {
      result.current.handleTouchStart(
        makeTouchEvent(100, {
          dataset: { dragHandle: 'true' },
        } as unknown as Partial<HTMLElement>),
      );
    });

    expect(result.current.isDragging).toBe(false);
  });

  it('provides drag style with transform', () => {
    const { result } = renderHook(() => useSwipeToClose({ onClose: vi.fn() }));

    act(() => {
      result.current.handleTouchStart(
        makeTouchEvent(100, {
          dataset: { dragHandle: 'true' },
        } as unknown as Partial<HTMLElement>),
      );
    });
    act(() => {
      result.current.handleTouchMove(makeTouchEvent(160));
    });

    expect(result.current.dragStyle.transform).toBe('translateY(60px)');
    expect(result.current.dragStyle.transition).toBe('none');
  });
});
