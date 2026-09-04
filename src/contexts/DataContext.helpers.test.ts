import { describe, it, expect } from 'vitest';
import {
  mergeUniqueById,
  replaceRecentWindow,
} from '@/contexts/DataContext.helpers';

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
