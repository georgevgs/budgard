import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const count = vi.hoisted(() => vi.fn());

vi.mock('@/constants/offlineQueue', () => ({
  offlineQueue: { count },
  OFFLINE_QUEUE_CHANGED_EVENT: 'offline-queue-changed',
}));

import { useOfflineQueueCount } from '@/common/hooks/useOfflineQueueCount';

describe('useOfflineQueueCount', () => {
  it('does not claim the queue is empty before IndexedDB answers', async () => {
    let resolveCount: (value: number) => void = () => undefined;
    count.mockReturnValue(
      new Promise((resolve) => {
        resolveCount = resolve;
      }),
    );
    const { result } = renderHook(() => useOfflineQueueCount());

    expect(result.current).toBeNull();

    await act(async () => resolveCount(3));
    await waitFor(() => expect(result.current).toBe(3));
  });
});
