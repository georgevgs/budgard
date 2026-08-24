import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import GripVertical from 'lucide-react/dist/esm/icons/grip-vertical';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Plus from 'lucide-react/dist/esm/icons/plus';
import BentoGrid from '@/components/bento/BentoGrid';
import TileLabel from '@/components/bento/TileLabel';
import {
  useTodayArrangeDrag,
  type TodayArrangeDrag,
} from '@/hooks/today/useTodayArrangeDrag';
import { haptics } from '@/lib/haptics';
import { prefersReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { TodayLayoutControls } from '@/hooks/today/useTodayLayout';
import { isWideTodayTile, type TodayTileId } from '@/lib/bentoLayout';

type Props = {
  layout: TodayLayoutControls;
};

// The grid, stood down to its labels so it can be rearranged. Real tiles are
// not shown here on purpose: arranging is about which module goes where, and
// six live charts competing for attention is the wrong screen for that
// decision — as well as six re-renders per tap.
const TodayArrange = ({ layout }: Props) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  useArrangeMode(pathname, layout.setArranging);
  const actions = useArrangeActions(layout, t);
  const drag = useTodayArrangeDrag({
    visible: layout.visible,
    onMove: layout.move,
    onDrop: actions.drop,
  });

  return (
    <div className="mt-4">
      <p role="status" aria-live="polite" className="sr-only">
        {actions.announcement}
      </p>
      {renderPersistenceHint(layout.isPersisted, t)}
      <BentoGrid className="today-arrange-grid">
        {layout.visible.map((id, index) =>
          renderVisible(id, index, layout, actions, drag, t),
        )}
      </BentoGrid>
      {renderDragOverlay(drag.draggingId, t)}
      <TileLabel className="mt-7 mb-2.5 px-1">
        {t('today.arrange.hidden')}
      </TileLabel>
      {renderHidden(layout, actions, t)}
      <button
        type="button"
        onClick={actions.reset}
        disabled={layout.isDefault}
        className="mx-auto mt-6 flex min-h-11 items-center text-xs font-semibold text-primary-ink underline-offset-4 hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t('today.arrange.reset')}
      </button>
    </div>
  );
};

export default TodayArrange;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

type ArrangeActions = {
  announcement: string;
  hide: (id: TodayTileId) => void;
  show: (id: TodayTileId) => void;
  move: (id: TodayTileId, offset: number) => void;
  drop: (id: TodayTileId, position: number, count: number) => void;
  reset: () => void;
};

const useArrangeActions = (
  layout: TodayLayoutControls,
  t: TFunc,
): ArrangeActions => {
  const [announcement, setAnnouncement] = useState('');
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => {
    const targetId = pendingFocus.current;
    if (!targetId) {
      return;
    }
    pendingFocus.current = null;
    document
      .querySelector<HTMLButtonElement>(`[data-arrange-control="${targetId}"]`)
      ?.focus();
  }, [layout.hidden, layout.visible]);

  const hide = (id: TodayTileId) => {
    const name = t(`today.tiles.${id}`);
    pendingFocus.current = controlId('show', id);
    layout.hide(id);
    haptics.light();
    setAnnouncement(t('today.arrange.hiddenAnnouncement', { name }));
  };

  const show = (id: TodayTileId) => {
    const name = t(`today.tiles.${id}`);
    pendingFocus.current = controlId('hide', id);
    layout.show(id);
    haptics.light();
    setAnnouncement(t('today.arrange.shownAnnouncement', { name }));
  };

  const move = (id: TodayTileId, offset: number) => {
    const currentIndex = layout.visible.indexOf(id);
    const nextIndex = currentIndex + offset;
    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= layout.visible.length
    ) {
      return;
    }
    commitWithMotion(() => layout.move(id, offset));
    haptics.selection();
    setAnnouncement(
      t('today.arrange.movedAnnouncement', {
        name: t(`today.tiles.${id}`),
        position: nextIndex + 1,
        count: layout.visible.length,
      }),
    );
  };

  const drop = (id: TodayTileId, position: number, count: number) => {
    setAnnouncement(
      t('today.arrange.droppedAnnouncement', {
        name: t(`today.tiles.${id}`),
        position,
        count,
      }),
    );
  };

  const reset = () => {
    if (layout.isDefault) {
      return;
    }
    layout.reset();
    haptics.success();
    setAnnouncement(t('today.arrange.resetAnnouncement'));
  };

  return { announcement, hide, show, move, drop, reset };
};

const useArrangeMode = (
  pathname: string,
  setArranging: (value: boolean) => void,
): void => {
  useEffect(() => {
    document.body.setAttribute('data-today-arranging', 'true');

    return () => document.body.removeAttribute('data-today-arranging');
  }, []);

  useEffect(() => {
    if (pathname === '/today') {
      return;
    }
    setArranging(false);
  }, [pathname, setArranging]);
};

const renderPersistenceHint = (isPersisted: boolean, t: TFunc) => {
  if (!isPersisted) {
    return (
      <p
        role="status"
        className="mb-4 text-xs leading-relaxed text-muted-foreground"
      >
        {t('today.arrange.sessionHint')}
      </p>
    );
  }

  return (
    <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
      {t('today.arrange.hint')}
    </p>
  );
};

const renderVisible = (
  id: TodayTileId,
  index: number,
  layout: TodayLayoutControls,
  actions: ArrangeActions,
  drag: TodayArrangeDrag,
  t: TFunc,
) => {
  const name = t(`today.tiles.${id}`);

  return (
    <div
      key={id}
      className={cn(
        'tile flex min-h-28 flex-col p-2',
        getSpanClass(id),
        getDraggingClass(id, drag.draggingId),
      )}
      data-arrange-tile={id}
      style={{ viewTransitionName: `today-arrange-${id}` }}
    >
      <div className="flex min-h-11 items-start gap-1">
        <div className="min-w-0 flex-1 px-1 pt-1.5" title={name}>
          <TileLabel className="line-clamp-2 overflow-hidden text-ellipsis leading-[1.35]">
            {name}
          </TileLabel>
        </div>
        {renderHide(id, name, actions, t)}
      </div>
      <div className="relative left-1/2 mt-auto grid w-[8.25rem] max-w-[calc(100%+1rem)] -translate-x-1/2 grid-cols-3">
        {renderDragHandle(id, drag)}
        {renderMove(id, -1, index === 0, actions, t)}
        {renderMove(id, 1, index === layout.visible.length - 1, actions, t)}
      </div>
    </div>
  );
};

const renderDragHandle = (id: TodayTileId, drag: TodayArrangeDrag) => {
  const isDragging = drag.draggingId === id;

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      data-arrange-drag-handle={id}
      onPointerDown={(event) => drag.start(id, event)}
      onPointerMove={(event) => drag.move(id, event)}
      onPointerUp={(event) => drag.end(id, event)}
      onPointerCancel={(event) => drag.cancel(id, event)}
      onLostPointerCapture={(event) => drag.cancel(id, event)}
      className={cn(
        'flex h-11 w-11 touch-none cursor-grab items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing',
        getDragHandleClass(isDragging),
      )}
    >
      <GripVertical className="h-4.5 w-4.5" />
    </button>
  );
};

const renderDragOverlay = (id: TodayTileId | null, t: TFunc) => {
  if (!id) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      data-arrange-drag-overlay
      className="tile lift pointer-events-none fixed top-0 left-0 z-70 flex flex-col p-2 will-change-transform"
      style={{
        width: 'var(--arrange-drag-width)',
        height: 'var(--arrange-drag-height)',
        transform:
          'translate3d(var(--arrange-drag-x), var(--arrange-drag-y), 0) scale(1.015)',
      }}
    >
      <div className="flex min-h-11 items-start gap-1">
        <TileLabel className="line-clamp-2 min-w-0 flex-1 overflow-hidden text-ellipsis px-1 pt-1.5 leading-[1.35]">
          {t(`today.tiles.${id}`)}
        </TileLabel>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground">
          <Minus className="h-4 w-4" />
        </span>
      </div>
      <div className="relative left-1/2 mt-auto grid w-[8.25rem] max-w-[calc(100%+1rem)] -translate-x-1/2 grid-cols-3">
        <span className="flex h-11 w-11 items-center justify-center text-foreground">
          <GripVertical className="h-4.5 w-4.5" />
        </span>
        <span className="flex h-11 w-11 items-center justify-center text-muted-foreground">
          <ChevronUp className="h-4 w-4" />
        </span>
        <span className="flex h-11 w-11 items-center justify-center text-muted-foreground">
          <ChevronDown className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
};

const renderHide = (
  id: TodayTileId,
  name: string,
  actions: ArrangeActions,
  t: TFunc,
) => (
  <button
    type="button"
    onClick={() => actions.hide(id)}
    data-arrange-control={controlId('hide', id)}
    aria-label={t('today.arrange.hide', { name })}
    className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <Minus className="h-4 w-4" />
  </button>
);

const getSpanClass = (id: TodayTileId): string => {
  if (isWideTodayTile(id)) {
    return 'bento-wide';
  }

  return '';
};

const getDraggingClass = (
  id: TodayTileId,
  draggingId: TodayTileId | null,
): string => {
  if (id === draggingId) {
    return 'opacity-25 ring-2 ring-ring';
  }

  return 'transition-[opacity,box-shadow]';
};

const getDragHandleClass = (isDragging: boolean): string => {
  if (isDragging) {
    return 'bg-accent text-foreground';
  }

  return '';
};

const renderMove = (
  id: TodayTileId,
  offset: number,
  isDisabled: boolean,
  actions: ArrangeActions,
  t: TFunc,
) => {
  const name = t(`today.tiles.${id}`);
  let label = t('today.arrange.moveDown', { name });
  let Icon = ChevronDown;
  if (offset < 0) {
    label = t('today.arrange.moveUp', { name });
    Icon = ChevronUp;
  }

  return (
    <button
      type="button"
      onClick={() => actions.move(id, offset)}
      disabled={isDisabled}
      aria-label={label}
      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-default disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
};

const renderHidden = (
  layout: TodayLayoutControls,
  actions: ArrangeActions,
  t: TFunc,
) => {
  if (layout.hidden.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {t('today.arrange.allShown')}
      </p>
    );
  }

  return (
    <BentoGrid className="today-arrange-grid">
      {layout.hidden.map((id) => {
        const name = t(`today.tiles.${id}`);

        return (
          <button
            key={id}
            type="button"
            onClick={() => actions.show(id)}
            data-arrange-control={controlId('show', id)}
            aria-label={t('today.arrange.show', { name })}
            title={name}
            className="tile-ghost grid min-h-14 cursor-pointer grid-cols-[2.75rem_minmax(0,1fr)] items-center rounded-[1.125rem] p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center text-primary-ink">
              <Plus className="h-4 w-4" />
            </span>
            <span className="line-clamp-2 min-w-0 overflow-hidden text-ellipsis px-2 text-[0.8rem] font-medium leading-snug text-muted-foreground">
              {name}
            </span>
          </button>
        );
      })}
    </BentoGrid>
  );
};

type ControlAction = 'hide' | 'show';

const controlId = (action: ControlAction, id: TodayTileId): string =>
  `${action}-${id}`;

const commitWithMotion = (commit: () => void): void => {
  if (prefersReducedMotion() || !document.startViewTransition) {
    commit();

    return;
  }
  document.documentElement.classList.add('today-arrange-transition');
  const transition = document.startViewTransition(() => {
    flushSync(commit);
  });
  void transition.finished.finally(() => {
    document.documentElement.classList.remove('today-arrange-transition');
  });
};
