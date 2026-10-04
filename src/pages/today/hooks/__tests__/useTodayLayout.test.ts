import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTodayLayout } from '@/pages/today/hooks/useTodayLayout';
import { dataService } from '@/common/api/dataService';
import { TODAY_TILES, type TodayLayout } from '@/pages/today/utils/bentoLayout';

const USER_ID = 'user-123';
const LAYOUT_KEY = `today-layout:${USER_ID}`;
const PENDING_KEY = `today-layout-sync-pending:${USER_ID}`;

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: USER_ID } } }),
}));

vi.mock('@/common/api/dataService', () => ({
  dataService: {
    getLayout: vi.fn(),
    saveLayout: vi.fn(),
  },
}));

const showErrorToast = vi.hoisted(() => vi.fn());
vi.mock('@/common/hooks/dataOps/useShowErrorToast', () => ({
  useShowErrorToast: () => showErrorToast,
}));
const captureException = vi.hoisted(() => vi.fn());
vi.mock('@/config/sentry', () => ({ captureException }));

const customLayout = (visible: TodayLayout['visible']): TodayLayout => {
  const visibleSet = new Set(visible);

  return {
    visible,
    hidden: TODAY_TILES.filter((tile) => !visibleSet.has(tile)),
  };
};

beforeEach(() => {
  localStorage.clear();
  vi.mocked(dataService.getLayout).mockResolvedValue(null);
  vi.mocked(dataService.saveLayout).mockResolvedValue();
});

describe('useTodayLayout account sync', () => {
  it('hydrates the owner layout from the server', async () => {
    const remote = customLayout(['insight', 'safeToSpend']);
    vi.mocked(dataService.getLayout).mockResolvedValue(remote);
    const { result } = renderHook(() => useTodayLayout());

    await waitFor(() => {
      expect(result.current.visible).toEqual(remote.visible);
    });

    expect(JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? '{}')).toEqual(
      remote,
    );
  });

  it('seeds a missing server row from the existing device layout', async () => {
    const local = customLayout(['weeklyRecap', 'budgetUsed']);
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(local));
    renderHook(() => useTodayLayout());

    await waitFor(() => {
      expect(dataService.saveLayout).toHaveBeenCalledWith(local);
    });
  });

  it('keeps a local edit made while the initial fetch is in flight', async () => {
    let resolveRemote: (layout: TodayLayout | null) => void = () => undefined;
    vi.mocked(dataService.getLayout).mockReturnValue(
      new Promise((resolve) => {
        resolveRemote = resolve;
      }),
    );
    const { result } = renderHook(() => useTodayLayout());

    act(() => result.current.hide('safeToSpend'));
    await act(async () => resolveRemote(customLayout(['insight'])));

    expect(result.current.visible).not.toContain('safeToSpend');
    expect(dataService.saveLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        hidden: expect.arrayContaining(['safeToSpend']),
      }),
    );
  });

  it('retries a pending offline layout instead of accepting an older server copy', async () => {
    const local = customLayout(['weeklyRecap', 'budgetUsed']);
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(local));
    localStorage.setItem(PENDING_KEY, 'true');
    vi.mocked(dataService.getLayout).mockResolvedValue(
      customLayout(['safeToSpend']),
    );
    const { result } = renderHook(() => useTodayLayout());

    await waitFor(() => {
      expect(dataService.saveLayout).toHaveBeenCalledWith(local);
    });

    expect(result.current.visible).toEqual(local.visible);
    expect(localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('reports when the latest account sync fails', async () => {
    vi.mocked(dataService.getLayout).mockResolvedValue(
      customLayout(['safeToSpend', 'budgetUsed']),
    );
    vi.mocked(dataService.saveLayout).mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useTodayLayout());
    await waitFor(() => expect(result.current.visible).toHaveLength(2));

    act(() => result.current.move('safeToSpend', 1));

    await waitFor(() => expect(result.current.isPersisted).toBe(false));
    expect(localStorage.getItem(PENDING_KEY)).toBe('true');
  });

  it('keeps the retry marker until the latest save succeeds', async () => {
    const remote = customLayout(['safeToSpend', 'budgetUsed', 'insight']);
    vi.mocked(dataService.getLayout).mockResolvedValue(remote);
    const { result } = renderHook(() => useTodayLayout());
    await waitFor(() => expect(result.current.visible).toEqual(remote.visible));
    const resolveSaves: Array<() => void> = [];
    vi.mocked(dataService.saveLayout).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSaves.push(resolve);
        }),
    );

    act(() => result.current.hide('safeToSpend'));
    act(() => result.current.hide('budgetUsed'));
    await waitFor(() => expect(resolveSaves).toHaveLength(2));

    await act(async () => resolveSaves[0]());
    expect(localStorage.getItem(PENDING_KEY)).toBe('true');

    await act(async () => resolveSaves[1]());
    expect(localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('retries the latest arrangement after a permanent save failure', async () => {
    const remote = customLayout(['safeToSpend', 'budgetUsed', 'insight']);
    vi.mocked(dataService.getLayout).mockResolvedValue(remote);
    const { result } = renderHook(() => useTodayLayout());
    await waitFor(() => expect(result.current.visible).toEqual(remote.visible));
    vi.mocked(dataService.saveLayout).mockRejectedValueOnce(
      new Error('denied'),
    );

    act(() => result.current.hide('safeToSpend'));
    await waitFor(() => expect(showErrorToast).toHaveBeenCalled());
    const retry = showErrorToast.mock.calls[0][1] as () => void;
    act(() => result.current.hide('budgetUsed'));
    await waitFor(() => expect(result.current.isPersisted).toBe(true));
    const latest = {
      visible: result.current.visible,
      hidden: result.current.hidden,
    };
    act(() => retry());

    await waitFor(() =>
      expect(dataService.saveLayout).toHaveBeenCalledTimes(3),
    );
    expect(dataService.saveLayout).toHaveBeenLastCalledWith(latest);
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { operation: 'saveTodayLayout' },
    });
  });

  it('keeps an offline edit pending without an error toast', async () => {
    vi.mocked(dataService.getLayout).mockResolvedValue(
      customLayout(['safeToSpend']),
    );
    const { result } = renderHook(() => useTodayLayout());
    await waitFor(() => expect(result.current.visible).toHaveLength(1));
    vi.mocked(dataService.saveLayout).mockRejectedValue(
      new Error('Failed to fetch'),
    );

    act(() => result.current.hide('safeToSpend'));

    await waitFor(() => expect(result.current.isPersisted).toBe(false));
    expect(result.current.visible).toEqual([]);
    expect(localStorage.getItem(PENDING_KEY)).toBe('true');
    expect(showErrorToast).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  it('does not mark a newer saved layout pending when an older request fails', async () => {
    const remote = customLayout(['safeToSpend', 'budgetUsed', 'insight']);
    vi.mocked(dataService.getLayout).mockResolvedValue(remote);
    const { result } = renderHook(() => useTodayLayout());
    await waitFor(() => expect(result.current.visible).toEqual(remote.visible));
    let rejectOld: (error: Error) => void = () => undefined;
    vi.mocked(dataService.saveLayout).mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectOld = reject;
        }),
    );

    act(() => result.current.hide('safeToSpend'));
    act(() => result.current.hide('budgetUsed'));
    await waitFor(() => expect(localStorage.getItem(PENDING_KEY)).toBeNull());
    await act(async () => rejectOld(new Error('Failed to fetch')));

    expect(result.current.isPersisted).toBe(true);
    expect(localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('keeps a cache miss unresolved until the account row is checked', async () => {
    let resolveRemote: (layout: TodayLayout | null) => void = () => undefined;
    vi.mocked(dataService.getLayout).mockReturnValue(
      new Promise((resolve) => {
        resolveRemote = resolve;
      }),
    );
    const { result } = renderHook(() => useTodayLayout());

    expect(result.current.isHydrated).toBe(false);

    await act(async () => resolveRemote(null));
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
  });
});
