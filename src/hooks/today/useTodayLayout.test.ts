import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTodayLayout } from '@/hooks/today/useTodayLayout';
import { uiPreferencesService } from '@/services/uiPreferencesService';
import { TODAY_TILES, type TodayLayout } from '@/lib/bentoLayout';

vi.mock('@/services/uiPreferencesService', () => ({
  uiPreferencesService: {
    getTodayLayout: vi.fn(),
    saveTodayLayout: vi.fn(),
  },
}));

const customLayout = (visible: TodayLayout['visible']): TodayLayout => {
  const visibleSet = new Set(visible);

  return {
    visible,
    hidden: TODAY_TILES.filter((tile) => !visibleSet.has(tile)),
  };
};

beforeEach(() => {
  localStorage.clear();
  vi.mocked(uiPreferencesService.getTodayLayout).mockResolvedValue(null);
  vi.mocked(uiPreferencesService.saveTodayLayout).mockResolvedValue();
});

describe('useTodayLayout account sync', () => {
  it('hydrates the owner layout from the server', async () => {
    const remote = customLayout(['insight', 'safeToSpend']);
    vi.mocked(uiPreferencesService.getTodayLayout).mockResolvedValue(remote);
    const { result } = renderHook(() => useTodayLayout());

    await waitFor(() => {
      expect(result.current.visible).toEqual(remote.visible);
    });

    expect(JSON.parse(localStorage.getItem('today-layout') ?? '{}')).toEqual(
      remote,
    );
  });

  it('seeds a missing server row from the existing device layout', async () => {
    const local = customLayout(['weeklyRecap', 'budgetUsed']);
    localStorage.setItem('today-layout', JSON.stringify(local));
    renderHook(() => useTodayLayout());

    await waitFor(() => {
      expect(uiPreferencesService.saveTodayLayout).toHaveBeenCalledWith(local);
    });
  });

  it('keeps a local edit made while the initial fetch is in flight', async () => {
    let resolveRemote: (layout: TodayLayout | null) => void = () => undefined;
    vi.mocked(uiPreferencesService.getTodayLayout).mockReturnValue(
      new Promise((resolve) => {
        resolveRemote = resolve;
      }),
    );
    const { result } = renderHook(() => useTodayLayout());

    act(() => result.current.hide('safeToSpend'));
    await act(async () => resolveRemote(customLayout(['insight'])));

    expect(result.current.visible).not.toContain('safeToSpend');
    expect(uiPreferencesService.saveTodayLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        hidden: expect.arrayContaining(['safeToSpend']),
      }),
    );
  });

  it('retries a pending offline layout instead of accepting an older server copy', async () => {
    const local = customLayout(['weeklyRecap', 'budgetUsed']);
    localStorage.setItem('today-layout', JSON.stringify(local));
    localStorage.setItem('today-layout-sync-pending', 'true');
    vi.mocked(uiPreferencesService.getTodayLayout).mockResolvedValue(
      customLayout(['safeToSpend']),
    );
    const { result } = renderHook(() => useTodayLayout());

    await waitFor(() => {
      expect(uiPreferencesService.saveTodayLayout).toHaveBeenCalledWith(local);
    });

    expect(result.current.visible).toEqual(local.visible);
    expect(localStorage.getItem('today-layout-sync-pending')).toBeNull();
  });

  it('reports when the latest account sync fails', async () => {
    vi.mocked(uiPreferencesService.getTodayLayout).mockResolvedValue(
      customLayout(['safeToSpend', 'budgetUsed']),
    );
    vi.mocked(uiPreferencesService.saveTodayLayout).mockRejectedValue(
      new Error('offline'),
    );
    const { result } = renderHook(() => useTodayLayout());
    await waitFor(() => expect(result.current.visible).toHaveLength(2));

    act(() => result.current.move('safeToSpend', 1));

    await waitFor(() => expect(result.current.isPersisted).toBe(false));
    expect(localStorage.getItem('today-layout-sync-pending')).toBe('true');
  });

  it('keeps the retry marker until the latest save succeeds', async () => {
    const remote = customLayout(['safeToSpend', 'budgetUsed', 'insight']);
    vi.mocked(uiPreferencesService.getTodayLayout).mockResolvedValue(remote);
    const { result } = renderHook(() => useTodayLayout());
    await waitFor(() => expect(result.current.visible).toEqual(remote.visible));
    const resolveSaves: Array<() => void> = [];
    vi.mocked(uiPreferencesService.saveTodayLayout).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSaves.push(resolve);
        }),
    );

    act(() => result.current.hide('safeToSpend'));
    act(() => result.current.hide('budgetUsed'));
    await waitFor(() => expect(resolveSaves).toHaveLength(2));

    await act(async () => resolveSaves[0]());
    expect(localStorage.getItem('today-layout-sync-pending')).toBe('true');

    await act(async () => resolveSaves[1]());
    expect(localStorage.getItem('today-layout-sync-pending')).toBeNull();
  });
});
