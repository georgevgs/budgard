import { describe, expect, it, vi } from 'vitest';
import { emptyStorageFolder } from '../../../supabase/functions/_shared/storageCleanup.ts';

const FOLDER = 'user-1';

const makeBucket = (count: number) => {
  let names = Array.from({ length: count }, (_, index) => `receipt-${index}`);
  const list = vi.fn(
    async (_folder: string, options: { limit: number; offset: number }) => ({
      data: names
        .slice(options.offset, options.offset + options.limit)
        .map((name) => ({ name })),
      error: null,
    }),
  );
  const remove = vi.fn(async (paths: string[]) => {
    const removed = new Set(paths.map((path) => path.slice(FOLDER.length + 1)));
    names = names.filter((name) => !removed.has(name));

    return { error: null };
  });

  return { bucket: { list, remove }, list, remove, remaining: () => names };
};

describe('Storage folder cleanup', () => {
  it('does not skip compacted pages after deleting more than 1,000 files', async () => {
    const { bucket, list, remove, remaining } = makeBucket(1501);

    await emptyStorageFolder(bucket, FOLDER);

    expect(remaining()).toEqual([]);
    expect(remove).toHaveBeenCalledTimes(2);
    expect(list.mock.calls.map((call) => call[1].offset)).toEqual([0, 0]);
  });

  it('stops before deletion when listing fails', async () => {
    const listError = new Error('list failed');
    const bucket = {
      list: vi.fn().mockResolvedValue({ data: null, error: listError }),
      remove: vi.fn(),
    };

    await expect(emptyStorageFolder(bucket, FOLDER)).rejects.toBe(listError);
    expect(bucket.remove).not.toHaveBeenCalled();
  });

  it('surfaces removal failures so account deletion can be retried', async () => {
    const removeError = new Error('remove failed');
    const bucket = {
      list: vi.fn().mockResolvedValue({
        data: [{ name: 'receipt.webp' }],
        error: null,
      }),
      remove: vi.fn().mockResolvedValue({ error: removeError }),
    };

    await expect(emptyStorageFolder(bucket, FOLDER)).rejects.toBe(removeError);
  });
});
