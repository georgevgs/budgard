import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/common/contexts/AuthContext';
import {
  DEFAULT_VISIBLE,
  TODAY_TILES,
  clearTodayLayoutSyncPending,
  hasTodayLayoutSyncPending,
  isDefaultLayout,
  markTodayLayoutSyncPending,
  moveTile,
  readStoredLayoutSnapshot,
  writeStoredLayout,
  type TodayLayout,
  type TodayTileId,
} from '@/pages/today/utils/bentoLayout';
import { todayApi } from '@/pages/today/todayApi';

export type UseTodayLayoutReturn = TodayLayout & {
  isHydrated: boolean;
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
export const useTodayLayout = (): UseTodayLayoutReturn => {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const [initial] = useState(() => readStoredLayoutSnapshot(userId));
  const [layout, setLayout] = useState<TodayLayout>(initial.layout);
  const layoutRef = useRef(layout);
  const [isHydrated, setIsHydrated] = useState(initial.isStored);
  const [isArranging, setArranging] = useState(false);
  const [isPersisted, setIsPersisted] = useState(initial.isStored);
  const hasCommittedRef = useRef(false);
  const persistVersionRef = useRef(0);

  const persist = useCallback(
    (next: TodayLayout) => {
      const version = persistVersionRef.current + 1;
      persistVersionRef.current = version;
      setIsPersisted(writeStoredLayout(userId, next));
      markTodayLayoutSyncPending(userId);

      void todayApi
        .saveLayout(next)
        .then(() => {
          if (persistVersionRef.current !== version) {
            return;
          }

          clearTodayLayoutSyncPending(userId);
          setIsPersisted(true);
        })
        .catch(() => {
          if (persistVersionRef.current === version) {
            setIsPersisted(false);
          }
        });
    },
    [userId],
  );

  useEffect(() => {
    const run = { active: true };
    void hydrateFromServer(run, {
      persist,
      layoutRef,
      hasCommittedRef,
      setLayout,
      setIsHydrated,
      setIsPersisted,
      userId,
    });

    return () => {
      run.active = false;
    };
  }, [persist, userId]);

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
      setIsHydrated(true);
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
    isHydrated,
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

type LayoutUpdate = (current: TodayLayout) => TodayLayout;

type HydrateDeps = {
  persist: (next: TodayLayout) => void;
  layoutRef: { current: TodayLayout };
  hasCommittedRef: { current: boolean };
  setLayout: (next: TodayLayout) => void;
  setIsHydrated: (value: boolean) => void;
  setIsPersisted: (value: boolean) => void;
  userId: string;
};

// On mount, reconcile the layout held locally with the owner-scoped row. A
// local edit that never reached the server wins and is re-sent; otherwise the
// server's copy is adopted so a second device sees the same grid.
const hydrateFromServer = async (
  run: { active: boolean },
  {
    persist,
    layoutRef,
    hasCommittedRef,
    setLayout,
    setIsHydrated,
    setIsPersisted,
    userId,
  }: HydrateDeps,
): Promise<void> => {
  try {
    const remote = await todayApi.getLayout();
    if (!run.active) {
      return;
    }
    if (hasCommittedRef.current) {
      setIsHydrated(true);

      return;
    }
    if (hasTodayLayoutSyncPending(userId)) {
      setIsHydrated(true);
      persist(layoutRef.current);

      return;
    }
    if (!remote) {
      setIsHydrated(true);
      persist(layoutRef.current);

      return;
    }

    layoutRef.current = remote;
    setLayout(remote);
    writeStoredLayout(userId, remote);
    setIsHydrated(true);
    setIsPersisted(true);
  } catch {
    if (run.active) {
      setIsHydrated(true);
      setIsPersisted(false);
    }
  }
};
