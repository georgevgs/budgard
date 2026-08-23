import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VISIBLE,
  TODAY_TILES,
  moveTile,
  readStoredLayout,
  writeStoredLayout,
  type TodayLayout,
} from '@/lib/bentoLayout';

describe('normalizing a stored Today layout', () => {
  const load = (stored: unknown): TodayLayout => {
    localStorage.setItem('today-layout', JSON.stringify(stored));

    return readStoredLayout();
  };

  it('gives a first-time user the defaults', () => {
    localStorage.clear();

    expect(readStoredLayout().visible).toEqual(DEFAULT_VISIBLE);
  });

  // The reason both lists are stored rather than just `visible`: a tile in
  // neither is one this build added, and it has to land on its default rather
  // than be mistaken for something the user hid.
  it('places a newly shipped tile by its default, not as hidden', () => {
    const layout = load({ visible: ['safeToSpend'], hidden: ['netWorth'] });

    expect(layout.visible).toContain('budgetUsed');
    expect(layout.hidden).not.toContain('budgetUsed');
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
    localStorage.setItem('today-layout', 'not json');

    expect(readStoredLayout().visible).toEqual(DEFAULT_VISIBLE);
  });

  it('round-trips through storage', () => {
    const layout: TodayLayout = { visible: ['insight'], hidden: [] };
    writeStoredLayout(layout);

    expect(readStoredLayout().visible[0]).toBe('insight');
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
