import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_VISIBLE,
  TODAY_TILES,
  clearTodayLayoutSyncPending,
  hasTodayLayoutSyncPending,
  isDefaultLayout,
  markTodayLayoutSyncPending,
  moveTile,
  readStoredLayout,
  writeStoredLayout,
  type TodayLayout,
  type TodayTileId,
} from '@/lib/bentoLayout';
import { uiPreferencesService } from '@/services/uiPreferencesService';

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
 * The Today grid's arrangement. Local storage keeps the first frame instant;
 * the owner-scoped server copy then brings the same layout to every device.
 */
export const useTodayLayout = (): TodayLayoutControls => {
  const [layout, setLayout] = useState<TodayLayout>(readStoredLayout);
  const layoutRef = useRef(layout);
  const [isArranging, setArranging] = useState(false);
  const [isPersisted, setIsPersisted] = useState(true);
  const hasCommittedRef = useRef(false);
  const persistVersionRef = useRef(0);

  const persist = useCallback((next: TodayLayout) => {
    const version = persistVersionRef.current + 1;
    persistVersionRef.current = version;
    setIsPersisted(writeStoredLayout(next));
    markTodayLayoutSyncPending();

    void uiPreferencesService
      .saveTodayLayout(next)
      .then(() => {
        if (persistVersionRef.current !== version) {
          return;
        }

        clearTodayLayoutSyncPending();
        setIsPersisted(true);
      })
      .catch(() => {
        if (persistVersionRef.current === version) {
          setIsPersisted(false);
        }
      });
  }, []);

  useEffect(() => {
    let active = true;

    void uiPreferencesService
      .getTodayLayout()
      .then((remote) => {
        if (!active || hasCommittedRef.current) {
          return;
        }
        if (hasTodayLayoutSyncPending()) {
          persist(layoutRef.current);

          return;
        }
        if (!remote) {
          persist(layoutRef.current);

          return;
        }

        layoutRef.current = remote;
        setLayout(remote);
        writeStoredLayout(remote);
        setIsPersisted(true);
      })
      .catch(() => {
        if (active) {
          setIsPersisted(false);
        }
      });

    return () => {
      active = false;
    };
  }, [persist]);

  const commit = useCallback(
    (update: LayoutUpdate) => {
      const current = layoutRef.current;
      const next = update(current);
      if (next === current) {
        return;
      }
      hasCommittedRef.current = true;
      layoutRef.current = next;
      setLayout(next);
      persist(next);
    },
    [persist],
  );

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
        hidden: TODAY_TILES.filter((tile) => !DEFAULT_VISIBLE.includes(tile)),
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
