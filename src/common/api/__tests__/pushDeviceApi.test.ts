import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/config/supabase';
import {
  pushDeviceApi,
  releaseAccountPush,
  releaseDevicePush,
} from '@/common/api/pushDeviceApi';

const ENDPOINT = 'https://push.example/subscription';

describe('pushDeviceApi', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(supabase.from).mockReset();
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('throws when deleting the subscription fails', async () => {
    const { eq } = mockDelete({ message: 'delete failed' });

    await expect(pushDeviceApi.removeDevice(ENDPOINT)).rejects.toEqual({
      message: 'delete failed',
    });
    expect(eq).toHaveBeenCalledWith('endpoint', ENDPOINT);
  });

  it('treats a row hidden by RLS as not registered', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({ eq }),
    } as never);

    await expect(pushDeviceApi.isRegistered(ENDPOINT)).resolves.toBe(false);
    expect(eq).toHaveBeenCalledWith('endpoint', ENDPOINT);
  });

  describe('on sign-out', () => {
    let unsubscribe: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      unsubscribe = installDeviceSubscription();
    });

    it('deletes this device row, then drops the browser subscription', async () => {
      const { eq } = mockDelete(null);

      await releaseDevicePush();

      expect(eq).toHaveBeenCalledWith('endpoint', ENDPOINT);
      expect(eq.mock.invocationCallOrder[0]).toBeLessThan(
        unsubscribe.mock.invocationCallOrder[0],
      );
    });

    it('still drops the browser subscription when the delete fails', async () => {
      mockDelete({ message: 'offline' });

      await expect(releaseDevicePush()).resolves.toBeUndefined();
      expect(unsubscribe).toHaveBeenCalledOnce();
    });

    it('does not let a hung delete hold sign-out open', async () => {
      vi.useFakeTimers();
      const eq = vi.fn().mockReturnValue(new Promise(() => {}));
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({ eq }),
      } as never);

      const release = releaseDevicePush();
      await vi.advanceTimersByTimeAsync(3000);
      await release;

      expect(unsubscribe).toHaveBeenCalledOnce();
    });

    it('deletes every device row on sign-out everywhere', async () => {
      const { eq } = mockDelete(null);

      await releaseAccountPush('user-1');

      expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(unsubscribe).toHaveBeenCalledOnce();
    });
  });
});

const mockDelete = (error: { message: string } | null) => {
  const eq = vi.fn().mockResolvedValue({ data: null, error });
  vi.mocked(supabase.from).mockReturnValue({
    delete: vi.fn().mockReturnValue({ eq }),
  } as never);

  return { eq };
};

const installDeviceSubscription = (): ReturnType<typeof vi.fn> => {
  const unsubscribe = vi.fn().mockResolvedValue(true);
  const registration = {
    pushManager: {
      getSubscription: vi
        .fn()
        .mockResolvedValue({ endpoint: ENDPOINT, unsubscribe }),
    },
  };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: vi.fn().mockResolvedValue(registration) },
  });

  return unsubscribe;
};
