/**
 * Which modules the Today grid shows, and in what order.
 *
 * The bento grid is an editable home screen rather than a fixed scroll, so the
 * order and the visible set are the user's, not ours. They live in
 * localStorage next to the theme and the accent — the other two choices about
 * how the app looks that are already stored per device.
 */

export const TODAY_TILES = [
  'safeToSpend',
  'budgetUsed',
  'monthPace',
  'upcoming',
  'topCategory',
  'insight',
  'recentActivity',
  'weeklyRecap',
  'netWorth',
  'debts',
] as const;

export type TodayTileId = (typeof TODAY_TILES)[number];

export type TodayLayout = {
  visible: TodayTileId[];
  hidden: TodayTileId[];
};

/** What a new account sees: the money, then the pace, then what is coming. */
export const DEFAULT_VISIBLE: TodayTileId[] = [
  'safeToSpend',
  'budgetUsed',
  'monthPace',
  'upcoming',
  'topCategory',
  'insight',
  'recentActivity',
];

const WIDE_TILES: readonly TodayTileId[] = [
  'safeToSpend',
  'upcoming',
  'recentActivity',
  'weeklyRecap',
];

export const isWideTodayTile = (id: TodayTileId): boolean =>
  WIDE_TILES.includes(id);

export const isDefaultLayout = (layout: TodayLayout): boolean => {
  if (!hasSameOrder(layout.visible, DEFAULT_VISIBLE)) {
    return false;
  }
  const defaultHidden = TODAY_TILES.filter(
    (tile) => !DEFAULT_VISIBLE.includes(tile),
  );

  return hasSameOrder(layout.hidden, defaultHidden);
};

const STORAGE_KEY = 'today-layout';
const SYNC_PENDING_KEY = 'today-layout-sync-pending';

const isTileId = (value: unknown): value is TodayTileId =>
  typeof value === 'string' &&
  (TODAY_TILES as readonly string[]).includes(value);

/**
 * Reconciles a stored layout with the tiles this build actually has.
 *
 * Both lists are stored, not just the visible one, which is the whole point: a
 * tile in neither list is one that did not exist when the user last arranged
 * their grid, so it can be placed by its default rather than guessed at. Store
 * only `visible` and a tile added in a later release is indistinguishable from
 * one the user deliberately hid.
 */
export const normalizeLayout = (stored: unknown): TodayLayout => {
  const source = stored as Partial<TodayLayout> | null;
  const visible = readList(source?.visible);
  const visibleSet = new Set(visible);
  const hidden = readList(source?.hidden).filter(
    (tile) => !visibleSet.has(tile),
  );
  const known = new Set([...visible, ...hidden]);
  const fresh = TODAY_TILES.filter((tile) => !known.has(tile));

  return {
    visible: [...visible, ...fresh.filter(isDefaultVisible)],
    hidden: [...hidden, ...fresh.filter((tile) => !isDefaultVisible(tile))],
  };
};

export const readStoredLayout = (): TodayLayout => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return normalizeLayout(null);
    }

    return normalizeLayout(JSON.parse(raw));
  } catch {
    // Unreadable or unavailable storage is not worth a broken home screen.
    return normalizeLayout(null);
  }
};

export const writeStoredLayout = (layout: TodayLayout): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));

    return true;
  } catch {
    // Private mode and a full quota both land here. The grid still works for
    // this session; tell the caller so the UI does not claim it was saved.
    return false;
  }
};

export const markTodayLayoutSyncPending = (): boolean => {
  try {
    localStorage.setItem(SYNC_PENDING_KEY, 'true');

    return true;
  } catch {
    return false;
  }
};

export const clearTodayLayoutSyncPending = (): void => {
  try {
    localStorage.removeItem(SYNC_PENDING_KEY);
  } catch {
    // The server copy is already current. A blocked local store cannot make
    // that write unsafe, and the next successful save will try again.
  }
};

export const hasTodayLayoutSyncPending = (): boolean => {
  try {
    return localStorage.getItem(SYNC_PENDING_KEY) === 'true';
  } catch {
    return false;
  }
};

/** Moves one tile by one position, clamped. Returns the same array if it
 *  cannot move, so React can skip the re-render. */
export const moveTile = (
  order: TodayTileId[],
  id: TodayTileId,
  offset: number,
): TodayTileId[] => {
  const from = order.indexOf(id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= order.length) {
    return order;
  }
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, id);

  return next;
};

// --- Helpers ---

const isDefaultVisible = (tile: TodayTileId): boolean =>
  DEFAULT_VISIBLE.includes(tile);

const hasSameOrder = (left: TodayTileId[], right: TodayTileId[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((tile, index) => tile === right[index]);
};

const readList = (value: unknown): TodayTileId[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<TodayTileId>();

  return value.filter((entry): entry is TodayTileId => {
    if (!isTileId(entry) || seen.has(entry)) {
      return false;
    }
    seen.add(entry);

    return true;
  });
};
