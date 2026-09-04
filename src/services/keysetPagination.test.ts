import { describe, expect, it } from 'vitest';
import { buildKeysetFilter } from '@/services/keysetPagination';

describe('buildKeysetFilter', () => {
  const cursor = [
    { name: 'date', value: '2026-01-15' },
    { name: 'created_at', value: '2026-01-15T12:00:00+00:00' },
    { name: 'id', value: 'row-7' },
  ];

  it('builds a descending cursor across every ordered column', () => {
    expect(buildKeysetFilter(cursor, 'descending')).toBe(
      'date.lt.2026-01-15,' +
        'and(date.eq.2026-01-15,created_at.lt.2026-01-15T12:00:00+00:00),' +
        'and(date.eq.2026-01-15,created_at.eq.2026-01-15T12:00:00+00:00,id.lt.row-7)',
    );
  });

  it('builds an ascending cursor', () => {
    expect(buildKeysetFilter(cursor.slice(0, 2), 'ascending')).toBe(
      'date.gt.2026-01-15,' +
        'and(date.eq.2026-01-15,created_at.gt.2026-01-15T12:00:00+00:00)',
    );
  });
});
