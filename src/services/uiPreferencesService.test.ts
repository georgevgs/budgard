import { describe, expect, it, vi } from 'vitest';
import { supabase } from '@/lib/supabase';
import { uiPreferencesService } from '@/services/uiPreferencesService';

const mockChain = (data: unknown = null, error: unknown = null) => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'maybeSingle', 'upsert']) {
    chain[method] = vi.fn(() => chain);
  }
  Object.defineProperty(chain, 'then', {
    value: (resolve: (value: unknown) => void) => resolve({ data, error }),
  });

  return chain;
};

describe('uiPreferencesService', () => {
  it('reads and normalizes the signed-in owner layout', async () => {
    const chain = mockChain({
      today_visible: ['insight', 'unknown'],
      today_hidden: ['safeToSpend'],
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await uiPreferencesService.getTodayLayout();

    expect(supabase.from).toHaveBeenCalledWith('user_ui_preferences');
    expect(chain.select).toHaveBeenCalledWith('today_visible, today_hidden');
    expect(result?.visible).toContain('insight');
    expect(result?.visible).not.toContain('unknown');
  });

  it('upserts by the owner primary key', async () => {
    const chain = mockChain();
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    const layout = {
      visible: ['insight'] as const,
      hidden: ['safeToSpend'] as const,
    };

    await uiPreferencesService.saveTodayLayout({
      visible: [...layout.visible],
      hidden: [...layout.hidden],
    });

    expect(chain.upsert).toHaveBeenCalledWith(
      {
        today_visible: ['insight'],
        today_hidden: ['safeToSpend'],
      },
      { onConflict: 'user_id' },
    );
  });

  it('surfaces Data API errors', async () => {
    const error = { message: 'denied' };
    vi.mocked(supabase.from).mockReturnValue(mockChain(null, error) as never);

    await expect(uiPreferencesService.getTodayLayout()).rejects.toEqual(error);
  });
});
