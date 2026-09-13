import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const track = vi.hoisted(() => vi.fn());
const cache = vi.hoisted(() => ({ hasDataSnapshot: vi.fn(() => false) }));

vi.mock('@/common/api/productEventService', () => ({
  trackProductEvent: track,
}));
vi.mock('@/constants/dataCache', () => cache);
vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));
vi.mock('@/common/contexts/FinancialSpaceContext', () => ({
  useFinancialSpace: () => ({ activeOwnerId: 'user-1' }),
}));

import { useProductMetrics } from '@/common/hooks/useProductMetrics';

beforeEach(() => {
  vi.clearAllMocks();
  cache.hasDataSnapshot.mockReturnValue(false);
});

describe('useProductMetrics', () => {
  it('measures a cold initial Today load once it is ready', () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(812.6);
    const { rerender } = renderHook(
      ({ ready }) => useProductMetrics('/today', ready),
      { initialProps: { ready: false } },
    );

    expect(track).toHaveBeenCalledWith({ name: 'app_opened' });
    rerender({ ready: true });
    rerender({ ready: true });

    expect(track).toHaveBeenCalledWith({
      name: 'today_ready',
      durationMs: 812.6,
      loadKind: 'cold',
    });
    expect(
      track.mock.calls.filter(([event]) => event.name === 'today_ready'),
    ).toHaveLength(1);
    clock.mockRestore();
  });

  it('does not label a later navigation to Today as app-start readiness', () => {
    const { rerender } = renderHook(
      ({ path, ready }) => useProductMetrics(path, ready),
      { initialProps: { path: '/plan', ready: true } },
    );

    rerender({ path: '/today', ready: true });

    expect(track).toHaveBeenCalledWith({ name: 'app_opened' });
    expect(
      track.mock.calls.some(([event]) => event.name === 'today_ready'),
    ).toBe(false);
  });
});
