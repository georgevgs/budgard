import { describe, it, expect } from 'vitest';
import { rows, row, maybeRow, done } from '@/services/supabaseCrud';

// A stand-in for a PostgREST query: awaiting it yields { data, error }.
const result = (
  data: unknown,
  error: unknown = null,
): PromiseLike<{ data: unknown; error: unknown }> => ({
  then: ((resolve: (v: { data: unknown; error: unknown }) => void) =>
    resolve({ data, error })) as PromiseLike<{
    data: unknown;
    error: unknown;
  }>['then'],
});

describe('supabaseCrud', () => {
  it('returns the rows a query produced', async () => {
    await expect(rows(result([{ id: 'a' }, { id: 'b' }]))).resolves.toEqual([
      { id: 'a' },
      { id: 'b' },
    ]);
  });

  it('returns a single row', async () => {
    await expect(row(result({ id: 'a' }))).resolves.toEqual({ id: 'a' });
  });

  it('returns null from maybeRow when nothing matched', async () => {
    await expect(maybeRow(result(null))).resolves.toBeNull();
  });

  it('resolves done without handing back data', async () => {
    await expect(done(result(null))).resolves.toBeUndefined();
  });

  it.each([
    ['rows', rows],
    ['row', row],
    ['maybeRow', maybeRow],
    ['done', done],
  ])('%s throws the PostgREST error rather than returning data', async (
    _name,
    fn,
  ) => {
    const err = new Error('permission denied');

    // Data alongside an error must never be handed back as a success.
    await expect(fn(result([{ id: 'leaked' }], err))).rejects.toThrow(
      'permission denied',
    );
  });
});
