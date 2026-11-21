import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/config/supabase';
import { categoriesApi } from '@/common/api/categoriesApi';

const OWNER_ID = 'user-1';

const mockUpsertChain = (finalData: unknown) => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.upsert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  Object.defineProperty(chain, 'then', {
    value: (resolve: (value: unknown) => void) =>
      resolve({ data: finalData, error: null }),
  });

  return chain;
};

describe('categoriesApi.createCategories', () => {
  it('upserts every row for the owner and skips names that already exist', async () => {
    const inserted = [{ id: 'c1', name: 'Food' }];
    const chain = mockUpsertChain(inserted);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await categoriesApi.createCategories(
      [{ name: 'Food' }, { name: 'Rent' }],
      OWNER_ID,
    );

    expect(supabase.from).toHaveBeenCalledWith('categories');
    expect(chain.upsert).toHaveBeenCalledWith(
      [
        { name: 'Food', user_id: OWNER_ID },
        { name: 'Rent', user_id: OWNER_ID },
      ],
      { onConflict: 'user_id,name', ignoreDuplicates: true },
    );
    expect(chain.select).toHaveBeenCalledWith();
    expect(result).toEqual(inserted);
  });
});
