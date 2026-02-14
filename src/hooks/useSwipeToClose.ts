import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSwipeToCloseOptions {
  onClose: () => void;
  threshold?: number; // Distance in pixels to trigger close
  enabled?: boolean; // Allow disabling on desktop
}

/**
 * Hook to handle swipe-to-close gesture for bottom sheet modals
 * Tracks touch movement and closes modal when swiped down past threshold
 */
export const useSwipeToClose = ({
  onClose,
  threshold = 100,
  enabled = true,
}: UseSwipeToCloseOptions) => {
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement;
      // Only start drag if touching the drag handle or header area
      const isDragHandle = target.closest('[data-drag-handle]');
      const isHeader = target.closest('[data-draggable-area]');

      if (!isDragHandle && !isHeader) return;

      startY.current = e.touches[0].clientY;
      currentY.current = startY.current;
      setIsDragging(true);
    },
    [enabled],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || !enabled) return;

      currentY.current = e.touches[0].clientY;
      const deltaY = currentY.current - startY.current;

      // Only allow dragging down (positive deltaY)
      if (deltaY > 0) {
        setTranslateY(deltaY);
      }
    },
    [isDragging, enabled, threshold],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !enabled) return;

    const shouldClose = translateY > threshold;

    setIsDragging(false);
    // Always reset position
    setTranslateY(0);

    // Close if dragged past threshold
    if (shouldClose) {
      onClose();
    }
  }, [isDragging, enabled, translateY, threshold, onClose]);

  // Reset state when modal closes or on unmount
  useEffect(() => {
    return () => {
      setTranslateY(0);
      setIsDragging(false);
    };
  }, []);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging,
    translateY,
    // Style object for the modal content
    dragStyle: {
      transform: `translateY(${translateY}px)`,
      transition: isDragging ? 'none' : 'transform 0.2s ease-out',
    },
    // Style object for the overlay (fade out as dragging)
    overlayStyle: {
      opacity: isDragging ? Math.max(0.3, 1 - translateY / (threshold * 2)) : 1,
      transition: isDragging ? 'none' : 'opacity 0.2s ease-out',
    },
  };
};
