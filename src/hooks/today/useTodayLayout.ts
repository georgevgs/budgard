import { useCallback, useRef, useState } from 'react';
import {
  DEFAULT_VISIBLE,
  TODAY_TILES,
  isDefaultLayout,
  moveTile,
  readStoredLayout,
  writeStoredLayout,
  type TodayLayout,
  type TodayTileId,
} from '@/lib/bentoLayout';

export type TodayLayoutControls = TodayLayout & {
  isArranging: boolean;
  isDefault: boolean;
  isPersisted: boolean;
  setArranging: (value: boolean) => void;
  hide: (id: TodayTileId) => void;
  show: (id: TodayTileId) => void;
  move: (id: TodayTileId, offset: number) => void;
  reset: () => void;
};

/**
 * The Today grid's arrangement. Reads once on mount and writes through on
 * every change — there is no server copy, so there is nothing to reconcile.
 */
export const useTodayLayout = (): TodayLayoutControls => {
  const [layout, setLayout] = useState<TodayLayout>(readStoredLayout);
  const layoutRef = useRef(layout);
  const [isArranging, setArranging] = useState(false);
  const [isPersisted, setIsPersisted] = useState(true);

  const commit = useCallback((update: LayoutUpdate) => {
    const current = layoutRef.current;
    const next = update(current);
    if (next === current) {

      return;
    }
    layoutRef.current = next;
    setLayout(next);
    setIsPersisted(writeStoredLayout(next));
  }, []);

  const hide = useCallback(
    (id: TodayTileId) => {
      commit((current) => {
        if (!current.visible.includes(id)) {

          return current;
        }

        return {
          visible: current.visible.filter((tile) => tile !== id),
          hidden: [...current.hidden.filter((tile) => tile !== id), id],
        };
      });
    },
    [commit],
  );

  const show = useCallback(
    (id: TodayTileId) => {
      commit((current) => {
        if (!current.hidden.includes(id)) {

          return current;
        }

        return {
          visible: [...current.visible.filter((tile) => tile !== id), id],
          hidden: current.hidden.filter((tile) => tile !== id),
        };
      });
    },
    [commit],
  );

  const move = useCallback(
    (id: TodayTileId, offset: number) => {
      commit((current) => {
        const visible = moveTile(current.visible, id, offset);
        if (visible === current.visible) {

          return current;
        }

        return { ...current, visible };
      });
    },
    [commit],
  );

  const reset = useCallback(() => {
    commit((current) => {
      if (isDefaultLayout(current)) {

        return current;
      }

      return {
        visible: [...DEFAULT_VISIBLE],
        hidden: TODAY_TILES.filter(
          (tile) => !DEFAULT_VISIBLE.includes(tile),
        ),
      };
    });
  }, [commit]);

  return {
    ...layout,
    isArranging,
    isDefault: isDefaultLayout(layout),
    isPersisted,
    setArranging,
    hide,
    show,
    move,
    reset,
  };
};

// --- Helpers ---

type LayoutUpdate = (current: TodayLayout) => TodayLayout;
