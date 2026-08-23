import { useCallback, useState } from 'react';
import {
  DEFAULT_VISIBLE,
  TODAY_TILES,
  moveTile,
  readStoredLayout,
  writeStoredLayout,
  type TodayLayout,
  type TodayTileId,
} from '@/lib/bentoLayout';

export type TodayLayoutControls = TodayLayout & {
  isArranging: boolean;
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
  const [isArranging, setArranging] = useState(false);

  const commit = useCallback((next: TodayLayout) => {
    setLayout(next);
    writeStoredLayout(next);
  }, []);

  const hide = useCallback(
    (id: TodayTileId) => {
      commit({
        visible: layout.visible.filter((tile) => tile !== id),
        hidden: [...layout.hidden, id],
      });
    },
    [commit, layout],
  );

  const show = useCallback(
    (id: TodayTileId) => {
      commit({
        visible: [...layout.visible, id],
        hidden: layout.hidden.filter((tile) => tile !== id),
      });
    },
    [commit, layout],
  );

  const move = useCallback(
    (id: TodayTileId, offset: number) => {
      const next = moveTile(layout.visible, id, offset);
      if (next === layout.visible) {
        return;
      }
      commit({ ...layout, visible: next });
    },
    [commit, layout],
  );

  const reset = useCallback(() => {
    commit({
      visible: [...DEFAULT_VISIBLE],
      hidden: TODAY_TILES.filter((tile) => !DEFAULT_VISIBLE.includes(tile)),
    });
  }, [commit]);

  return { ...layout, isArranging, setArranging, hide, show, move, reset };
};
