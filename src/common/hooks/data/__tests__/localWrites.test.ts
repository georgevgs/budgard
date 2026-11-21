import { describe, it, expect } from 'vitest';
import {
  changedRowIds,
  createLocalWriteLog,
  trackWrites,
  withLocalWrites,
} from '@/common/hooks/data/localWrites';

const rowA = { id: 'a', amount: 1 };
const rowB = { id: 'b', amount: 2 };

describe('changedRowIds', () => {
  it('reports an added row', () => {
    expect(changedRowIds([rowA], [rowB, rowA])).toEqual(['b']);
  });

  it('reports a replaced row', () => {
    expect(changedRowIds([rowA, rowB], [{ ...rowA }, rowB])).toEqual(['a']);
  });

  it('reports a removed row', () => {
    expect(changedRowIds([rowA, rowB], [rowA])).toEqual(['b']);
  });

  it('reports nothing for unchanged references', () => {
    expect(changedRowIds([rowA, rowB], [rowB, rowA])).toEqual([]);
  });
});

describe('createLocalWriteLog', () => {
  it('returns only ids recorded after the mark', () => {
    const log = createLocalWriteLog();
    log.record(['a']);
    const mark = log.mark();
    log.record(['b', 'c']);

    expect(log.idsSince(mark)).toEqual(['b', 'c']);
    expect(log.idsSince(0)).toEqual(['a', 'b', 'c']);
  });

  it('keeps at most the last 500 entries', () => {
    const log = createLocalWriteLog();
    const ids = Array.from({ length: 600 }, (_, index) => `id-${index}`);
    log.record(ids);

    const kept = log.idsSince(0);

    expect(kept).toHaveLength(500);
    expect(kept[0]).toBe('id-100');
    expect(kept[499]).toBe('id-599');
  });
});

describe('withLocalWrites', () => {
  it('splits touched ids by whether the local rows still have them', () => {
    const pending = { kept: new Set(['p']), deleted: new Set(['q']) };

    const merged = withLocalWrites(pending, ['a', 'gone'], [rowA]);

    expect([...merged.kept].sort()).toEqual(['a', 'p']);
    expect([...merged.deleted].sort()).toEqual(['gone', 'q']);
  });
});

describe('trackWrites', () => {
  it('records the ids an updater function changed and returns its result', () => {
    const log = createLocalWriteLog();
    const updater = trackWrites(log, (previous: (typeof rowA)[]) => [
      rowB,
      ...previous,
    ]);

    const result = (updater as (previous: (typeof rowA)[]) => (typeof rowA)[])([
      rowA,
    ]);

    expect(result).toEqual([rowB, rowA]);
    expect(log.idsSince(0)).toEqual(['b']);
  });

  it('records the ids a plain array replaced', () => {
    const log = createLocalWriteLog();
    const updater = trackWrites(log, [rowB]);

    (updater as (previous: (typeof rowA)[]) => (typeof rowA)[])([rowA]);

    expect(log.idsSince(0).sort()).toEqual(['a', 'b']);
  });
});
