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

/** What a new account sees: one answer, what is coming, and recent context. */
export const DEFAULT_VISIBLE: TodayTileId[] = [
  'safeToSpend',
  'upcoming',
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

export type StoredTodayLayoutSnapshot = {
  layout: TodayLayout;
  isStored: boolean;
};

export const readStoredLayoutSnapshot = (
  userId: string,
): StoredTodayLayoutSnapshot => {
  if (!userId) {
    return { layout: normalizeLayout(null), isStored: false };
  }

  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_KEY, userId));
    if (!raw) {
      return { layout: normalizeLayout(null), isStored: false };
    }

    return { layout: normalizeLayout(JSON.parse(raw)), isStored: true };
  } catch {
    // Unreadable or unavailable storage is not worth a broken home screen.
    return { layout: normalizeLayout(null), isStored: false };
  }
};

export const readStoredLayout = (userId: string): TodayLayout =>
  readStoredLayoutSnapshot(userId).layout;

export const writeStoredLayout = (
  userId: string,
  layout: TodayLayout,
): boolean => {
  if (!userId) {
    return false;
  }

  try {
    localStorage.setItem(
      scopedKey(STORAGE_KEY, userId),
      JSON.stringify(layout),
    );

    return true;
  } catch {
    // Private mode and a full quota both land here. The grid still works for
    // this session; tell the caller so the UI does not claim it was saved.
    return false;
  }
};

export const markTodayLayoutSyncPending = (userId: string): boolean => {
  if (!userId) {
    return false;
  }

  try {
    localStorage.setItem(scopedKey(SYNC_PENDING_KEY, userId), 'true');

    return true;
  } catch {
    return false;
  }
};

export const clearTodayLayoutSyncPending = (userId: string): void => {
  try {
    localStorage.removeItem(scopedKey(SYNC_PENDING_KEY, userId));
  } catch {
    // The server copy is already current. A blocked local store cannot make
    // that write unsafe, and the next successful save will try again.
  }
};

export const hasTodayLayoutSyncPending = (userId: string): boolean => {
  try {
    return localStorage.getItem(scopedKey(SYNC_PENDING_KEY, userId)) === 'true';
  } catch {
    return false;
  }
};

const scopedKey = (key: string, userId: string): string => `${key}:${userId}`;

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
