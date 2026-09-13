import { describe, expect, it, vi } from 'vitest';
import { supabase } from '@/config/supabase';
import { productEventService } from '@/common/api/productEventService';

const mockInsert = (error: unknown = null) => {
  const chain = {
    insert: vi.fn(() => ({ error })),
  };
  vi.mocked(supabase.from).mockReturnValue(chain as never);

  return chain;
};

describe('productEventService', () => {
  it('sends only the fixed event fields and performance context', async () => {
    const chain = mockInsert();

    await productEventService.create({
      name: 'today_ready',
      durationMs: 842.4,
      loadKind: 'cold',
    });

    expect(supabase.from).toHaveBeenCalledWith('product_events');
    expect(chain.insert).toHaveBeenCalledWith({
      event_name: 'today_ready',
      app_version: expect.any(String),
      duration_ms: 842,
      load_kind: 'cold',
    });
  });

  it('clamps duration to the database safety boundary', async () => {
    const chain = mockInsert();

    await productEventService.create({
      name: 'today_ready',
      durationMs: 999999,
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ duration_ms: 120000 }),
    );
  });

  it('surfaces insert errors to the best-effort tracker boundary', async () => {
    const error = { message: 'denied' };
    mockInsert(error);

    await expect(
      productEventService.create({ name: 'app_opened' }),
    ).rejects.toEqual(error);
  });
});
