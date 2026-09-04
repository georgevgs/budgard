import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { haptics } from '@/lib/haptics';
import type { TodayTileId } from '@/lib/bentoLayout';

type Options = {
  visible: TodayTileId[];
  onMove: (id: TodayTileId, offset: number) => void;
  onDrop: (id: TodayTileId, position: number, count: number) => void;
};

export type TodayArrangeDrag = {
  draggingId: TodayTileId | null;
  start: (id: TodayTileId, event: ReactPointerEvent<HTMLElement>) => void;
  move: (id: TodayTileId, event: ReactPointerEvent<HTMLElement>) => void;
  end: (id: TodayTileId, event: ReactPointerEvent<HTMLElement>) => void;
  cancel: (id: TodayTileId, event: ReactPointerEvent<HTMLElement>) => void;
};

const EDGE_SCROLL_ZONE_PX = 80;
const EDGE_SCROLL_STEP_PX = 12;

// Pointer capture keeps the drag alive even when the finger outruns the small
// grip. The real tile stays in the grid as a placeholder; a fixed overlay is
// moved through CSS variables so a 60fps gesture does not re-render the page.
export const useTodayArrangeDrag = ({
  visible,
  onMove,
  onDrop,
}: Options): TodayArrangeDrag => {
  const [draggingId, setDraggingId] = useState<TodayTileId | null>(null);
  const activeId = useRef<TodayTileId | null>(null);
  const activePointerId = useRef<number | null>(null);
  const didMove = useRef(false);
  const overlayOffset = useRef({ x: 0, y: 0 });
  const visibleRef = useRef(visible);
  const onMoveRef = useRef(onMove);
  const onDropRef = useRef(onDrop);

  useEffect(() => {
    visibleRef.current = visible;
    onMoveRef.current = onMove;
    onDropRef.current = onDrop;
  }, [visible, onMove, onDrop]);

  useEffect(() => {
    clearOverlay();

    return clearOverlay;
  }, []);

  const start = (id: TodayTileId, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || activeId.current) {
      return;
    }
    const tile = event.currentTarget.closest<HTMLElement>(
      '[data-arrange-tile]',
    );
    if (!tile) {
      return;
    }
    event.preventDefault();
    const rect = tile.getBoundingClientRect();
    overlayOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    activeId.current = id;
    activePointerId.current = event.pointerId;
    didMove.current = false;
    capturePointer(event);
    sizeOverlay(rect);
    positionOverlay(event.clientX, event.clientY, overlayOffset.current);
    setDraggingId(id);
    haptics.light();
  };

  const move = (id: TodayTileId, event: ReactPointerEvent<HTMLElement>) => {
    if (
      activeId.current !== id ||
      activePointerId.current !== event.pointerId
    ) {
      return;
    }
    event.preventDefault();
    positionOverlay(event.clientX, event.clientY, overlayOffset.current);
    autoScroll(event.clientY);

    const order = visibleRef.current;
    const targetId = readTargetId(event.clientX, event.clientY, order);
    if (!targetId || targetId === id) {
      return;
    }
    const currentIndex = order.indexOf(id);
    const targetIndex = order.indexOf(targetId);
    if (currentIndex < 0 || targetIndex < 0) {
      return;
    }
    didMove.current = true;
    onMoveRef.current(id, targetIndex - currentIndex);
    haptics.selection();
  };

  const finish = (
    id: TodayTileId,
    event: ReactPointerEvent<HTMLElement>,
    shouldAnnounce: boolean,
  ) => {
    if (
      activeId.current !== id ||
      activePointerId.current !== event.pointerId
    ) {
      return;
    }
    releasePointer(event);
    activeId.current = null;
    activePointerId.current = null;
    setDraggingId(null);
    clearOverlay();

    if (!didMove.current || !shouldAnnounce) {
      return;
    }
    const order = visibleRef.current;
    const position = order.indexOf(id);
    if (position < 0) {
      return;
    }
    haptics.selection();
    onDropRef.current(id, position + 1, order.length);
  };

  const end = (id: TodayTileId, event: ReactPointerEvent<HTMLElement>) =>
    finish(id, event, true);

  const cancel = (id: TodayTileId, event: ReactPointerEvent<HTMLElement>) =>
    finish(id, event, false);

  return { draggingId, start, move, end, cancel };
};

// --- Helpers ---

const capturePointer = (event: ReactPointerEvent<HTMLElement>): void => {
  if (typeof event.currentTarget.setPointerCapture !== 'function') {
    return;
  }
  event.currentTarget.setPointerCapture(event.pointerId);
};

const releasePointer = (event: ReactPointerEvent<HTMLElement>): void => {
  if (typeof event.currentTarget.releasePointerCapture !== 'function') {
    return;
  }
  if (
    typeof event.currentTarget.hasPointerCapture === 'function' &&
    !event.currentTarget.hasPointerCapture(event.pointerId)
  ) {
    return;
  }
  event.currentTarget.releasePointerCapture(event.pointerId);
};

const readTargetId = (
  clientX: number,
  clientY: number,
  visible: TodayTileId[],
): TodayTileId | null => {
  if (typeof document.elementFromPoint !== 'function') {
    return null;
  }
  const target = document
    .elementFromPoint(clientX, clientY)
    ?.closest<HTMLElement>('[data-arrange-tile]');
  const candidate = target?.dataset.arrangeTile;
  const match = visible.find((id) => id === candidate);
  if (!match) {
    return null;
  }

  return match;
};

const autoScroll = (clientY: number): void => {
  if (clientY < EDGE_SCROLL_ZONE_PX) {
    window.scrollBy({ top: -EDGE_SCROLL_STEP_PX, behavior: 'auto' });

    return;
  }
  if (clientY > window.innerHeight - EDGE_SCROLL_ZONE_PX) {
    window.scrollBy({ top: EDGE_SCROLL_STEP_PX, behavior: 'auto' });
  }
};

const sizeOverlay = (rect: DOMRect): void => {
  const root = document.documentElement;
  root.style.setProperty('--arrange-drag-width', `${rect.width}px`);
  root.style.setProperty('--arrange-drag-height', `${rect.height}px`);
};

const positionOverlay = (
  clientX: number,
  clientY: number,
  offset: { x: number; y: number },
): void => {
  const root = document.documentElement;
  root.style.setProperty('--arrange-drag-x', `${clientX - offset.x}px`);
  root.style.setProperty('--arrange-drag-y', `${clientY - offset.y}px`);
};

const clearOverlay = (): void => {
  const root = document.documentElement;
  root.style.removeProperty('--arrange-drag-width');
  root.style.removeProperty('--arrange-drag-height');
  root.style.removeProperty('--arrange-drag-x');
  root.style.removeProperty('--arrange-drag-y');
};
