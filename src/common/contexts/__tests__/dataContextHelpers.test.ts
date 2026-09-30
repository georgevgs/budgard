import { describe, it, expect } from 'vitest';
import {
  keepPendingWrites,
  mergeUniqueById,
  replaceRecentWindow,
} from '@/common/contexts/dataContextHelpers';

const row = (id: string, date: string) => ({ id, date });

describe('replaceRecentWindow', () => {
  const cutoff = '2026-01-01';

  it('replaces the recent window and keeps the pre-cutoff tail', () => {
    const prev = [
      row('recent-old', '2026-02-01'),
      row('tail-1', '2025-12-31'),
      row('tail-2', '2025-06-15'),
    ];
    const fresh = [row('recent-new', '2026-03-01')];

    const result = replaceRecentWindow(prev, fresh, cutoff);

    expect(result.map((r) => r.id)).toEqual(['recent-new', 'tail-1', 'tail-2']);
  });

  it('drops recent rows deleted on another device', () => {
    const prev = [row('deleted-elsewhere', '2026-02-01')];

    const result = replaceRecentWindow(prev, [], cutoff);

    expect(result).toEqual([]);
  });

  it('does not duplicate a row whose date moved across the cutoff', () => {
    // Edited on another device: the stale tail copy predates the cutoff,
    // the fresh copy is inside the window. Only the fresh copy survives.
    const prev = [row('moved', '2025-11-11')];
    const fresh = [row('moved', '2026-02-02')];

    const result = replaceRecentWindow(prev, fresh, cutoff);

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-02-02');
  });

  it('returns only fresh rows when previous state is empty', () => {
    const fresh = [row('a', '2026-02-01')];

    expect(replaceRecentWindow([], fresh, cutoff)).toEqual(fresh);
  });
});

describe('mergeUniqueById', () => {
  it('appends only rows whose id is not already present', () => {
    const prev = [row('a', '2026-01-01')];
    const incoming = [row('a', '2026-01-01'), row('b', '2025-01-01')];

    const result = mergeUniqueById(prev, incoming);

    expect(result.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('returns the same reference when nothing is new', () => {
    const prev = [row('a', '2026-01-01')];

    expect(mergeUniqueById(prev, [row('a', '2026-01-01')])).toBe(prev);
  });
});

// A refetch that lands before the offline queue drains knows nothing about
// what is still waiting: an offline-saved expense vanished until the sync
// caught up, an offline edit reverted, and an offline delete came back.
describe('keepPendingWrites', () => {
  const row = (id: string, amount: number) => ({ id, amount });
  const none = { kept: new Set<string>(), deleted: new Set<string>() };

  it('takes the server rows as they are when nothing is queued', () => {
    const fresh = [row('a', 1)];

    expect(keepPendingWrites([row('a', 9)], fresh, none)).toBe(fresh);
  });

  it('keeps a row created offline that the server has not seen yet', () => {
    const pending = { ...none, kept: new Set(['new']) };

    expect(
      keepPendingWrites([row('new', 5), row('a', 1)], [row('a', 1)], pending),
    ).toEqual([row('new', 5), row('a', 1)]);
  });

  it('keeps the local version of a row edited offline', () => {
    const pending = { ...none, kept: new Set(['a']) };

    expect(keepPendingWrites([row('a', 7)], [row('a', 1)], pending)).toEqual([
      row('a', 7),
    ]);
  });

  it('keeps a row deleted offline gone', () => {
    const pending = { ...none, deleted: new Set(['a']) };

    expect(keepPendingWrites([], [row('a', 1), row('b', 2)], pending)).toEqual([
      row('b', 2),
    ]);
  });
});
