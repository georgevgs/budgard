import { useRef } from 'react';
import type { ComponentProps, PointerEvent } from 'react';
import { DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Props = ComponentProps<typeof DropdownMenuTrigger> & {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

type TouchGesture = {
  pointerId: number;
  startX: number;
  startY: number;
};

// Radix opens dropdowns on pointer-down. That is useful for a mouse, but on a
// touchscreen it opens the menu before the browser knows whether the finger is
// tapping or scrolling. Delay touch activation until the finger is released
// without meaningful travel; mouse and keyboard behavior stays with Radix.
const ScrollSafeDropdownMenuTrigger = ({
  isOpen,
  onOpenChange,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  ...props
}: Props) => {
  const touchGesture = useRef<TouchGesture | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    onPointerDown?.(event);
    if (event.defaultPrevented || event.pointerType !== 'touch') {
      return;
    }

    // Stops Radix's pointer-down handler. This does not stop the browser from
    // taking over a vertical pan; pointer-cancel will clear the gesture then.
    event.preventDefault();
    touchGesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    onPointerMove?.(event);
    if (!isMatchingTouch(event, touchGesture.current)) {
      return;
    }
    if (hasMoved(event, touchGesture.current)) {
      touchGesture.current = null;
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    onPointerUp?.(event);
    const gesture = touchGesture.current;
    touchGesture.current = null;
    if (event.defaultPrevented || !isMatchingTouch(event, gesture)) {
      return;
    }
    if (hasMoved(event, gesture)) {
      return;
    }

    event.preventDefault();
    onOpenChange(!isOpen);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    onPointerCancel?.(event);
    touchGesture.current = null;
  };

  return (
    <DropdownMenuTrigger
      {...props}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    />
  );
};

export default ScrollSafeDropdownMenuTrigger;

// --- Helpers ---

const TAP_SLOP_PX = 10;

const isMatchingTouch = (
  event: PointerEvent<HTMLButtonElement>,
  gesture: TouchGesture | null,
): gesture is TouchGesture => {
  if (!gesture || event.pointerType !== 'touch') {
    return false;
  }

  return event.pointerId === gesture.pointerId;
};

const hasMoved = (
  event: PointerEvent<HTMLButtonElement>,
  gesture: TouchGesture,
): boolean => {
  const deltaX = Math.abs(event.clientX - gesture.startX);
  const deltaY = Math.abs(event.clientY - gesture.startY);

  return deltaX > TAP_SLOP_PX || deltaY > TAP_SLOP_PX;
};
