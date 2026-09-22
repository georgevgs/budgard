import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_VISIBLE,
  TODAY_TILES,
  isDefaultLayout,
  isWideTodayTile,
  moveTile,
  readStoredLayout,
  writeStoredLayout,
  type TodayLayout,
  clearTodayLayoutSyncPending,
  hasTodayLayoutSyncPending,
  markTodayLayoutSyncPending,
} from '@/pages/today/utils/bentoLayout';

const USER_ID = 'user-123';
const STORAGE_KEY = `today-layout:${USER_ID}`;

describe('normalizing a stored Today layout', () => {
  const load = (stored: unknown): TodayLayout => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    return readStoredLayout(USER_ID);
  };

  it('gives a first-time user the defaults', () => {
    localStorage.clear();

    expect(readStoredLayout(USER_ID).visible).toEqual(DEFAULT_VISIBLE);
  });

  // The reason both lists are stored rather than just `visible`: a tile in
  // neither is one this build added, and it has to land on its default rather
  // than be mistaken for something the user hid.
  it('places a missing default tile in the visible set', () => {
    const layout = load({ visible: ['safeToSpend'], hidden: ['netWorth'] });

    expect(layout.visible).toContain('upcoming');
    expect(layout.hidden).not.toContain('upcoming');
    expect(layout.hidden).toContain('netWorth');
  });

  it('keeps a tile the user deliberately hid hidden', () => {
    const hidden = TODAY_TILES.filter((tile) => tile !== 'budgetUsed');
    const layout = load({ visible: ['budgetUsed'], hidden });

    expect(layout.visible).toEqual(['budgetUsed']);
  });

  it('drops ids this build no longer has', () => {
    const layout = load({ visible: ['safeToSpend', 'ghostTile'], hidden: [] });

    expect(layout.visible).not.toContain('ghostTile');
  });

  it('drops duplicates rather than rendering a tile twice', () => {
    const layout = load({
      visible: ['safeToSpend', 'safeToSpend'],
      hidden: [],
    });

    expect(layout.visible.filter((id) => id === 'safeToSpend')).toHaveLength(1);
  });

  it('resolves a tile stored as both visible and hidden to visible', () => {
    const layout = load({
      visible: ['safeToSpend'],
      hidden: ['safeToSpend'],
    });

    expect(layout.visible).toContain('safeToSpend');
    expect(layout.hidden).not.toContain('safeToSpend');
  });

  it('survives unreadable storage', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');

    expect(readStoredLayout(USER_ID).visible).toEqual(DEFAULT_VISIBLE);
  });

  it('round-trips through storage', () => {
    const layout: TodayLayout = { visible: ['insight'], hidden: [] };
    expect(writeStoredLayout(USER_ID, layout)).toBe(true);

    expect(readStoredLayout(USER_ID).visible[0]).toBe('insight');
  });

  it('reports when the browser refuses to persist a change', () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Storage blocked', 'QuotaExceededError');
      });
    const layout: TodayLayout = { visible: ['insight'], hidden: [] };

    expect(writeStoredLayout(USER_ID, layout)).toBe(false);
    setItem.mockRestore();
  });

  it('does not expose one account layout to another account', () => {
    const layout: TodayLayout = { visible: ['insight'], hidden: [] };
    writeStoredLayout(USER_ID, layout);

    expect(readStoredLayout('another-user').visible).toEqual(DEFAULT_VISIBLE);
  });

  it('recognizes only the complete default layout', () => {
    const hidden = TODAY_TILES.filter(
      (tile) => !DEFAULT_VISIBLE.includes(tile),
    );

    expect(isDefaultLayout({ visible: [...DEFAULT_VISIBLE], hidden })).toBe(
      true,
    );
    expect(
      isDefaultLayout({ visible: [...DEFAULT_VISIBLE].reverse(), hidden }),
    ).toBe(false);
  });
});

describe('Today layout sync marker', () => {
  it('tracks and clears a layout waiting to sync', () => {
    expect(hasTodayLayoutSyncPending(USER_ID)).toBe(false);

    expect(markTodayLayoutSyncPending(USER_ID)).toBe(true);
    expect(hasTodayLayoutSyncPending(USER_ID)).toBe(true);

    clearTodayLayoutSyncPending(USER_ID);
    expect(hasTodayLayoutSyncPending(USER_ID)).toBe(false);
  });
});

describe('moving a tile', () => {
  const order = ['safeToSpend', 'budgetUsed', 'monthPace'] as const;

  it('moves one position at a time', () => {
    expect(moveTile([...order], 'monthPace', -1)).toEqual([
      'safeToSpend',
      'monthPace',
      'budgetUsed',
    ]);
  });

  // Same array back, so the caller can skip a write and a re-render.
  it('refuses to move past either end', () => {
    const start = [...order];

    expect(moveTile(start, 'safeToSpend', -1)).toBe(start);
    expect(moveTile(start, 'monthPace', 1)).toBe(start);
  });

  it('ignores a tile that is not in the order', () => {
    const start = [...order];

    expect(moveTile(start, 'debts', -1)).toBe(start);
  });
});

describe('Today tile spans', () => {
  it('keeps the Arrange preview aligned with the live grid', () => {
    expect(isWideTodayTile('safeToSpend')).toBe(true);
    expect(isWideTodayTile('upcoming')).toBe(true);
    expect(isWideTodayTile('recentActivity')).toBe(true);
    expect(isWideTodayTile('weeklyRecap')).toBe(true);
    expect(isWideTodayTile('budgetUsed')).toBe(false);
  });
});
