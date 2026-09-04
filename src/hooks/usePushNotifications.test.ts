import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  remove: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/services/pushSubscriptionService', () => ({
  pushSubscriptionService: {
    save: mocks.save,
    remove: mocks.remove,
  },
}));

type PushMocks = {
  subscription: PushSubscription;
  unsubscribe: ReturnType<typeof vi.fn>;
};

describe('usePushNotifications', () => {
  beforeEach(() => {
    mocks.save.mockReset();
    mocks.remove.mockReset();
    mocks.toast.mockReset();
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'AQ');
    vi.stubGlobal('PushManager', class PushManager {});
    vi.stubGlobal('Notification', {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('removes the browser subscription when the database save fails', async () => {
    const { subscription, unsubscribe } = installPushMocks();
    mocks.save.mockRejectedValue(new Error('write failed'));
    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: subscription.endpoint }),
    );
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(result.current.state).toBe('unsubscribed');
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'settings.notifications.enableFailed',
      }),
    );
  });

  it('keeps the browser subscription when the database delete fails', async () => {
    const { unsubscribe } = installPushMocks({ initiallySubscribed: true });
    mocks.remove.mockRejectedValue(new Error('delete failed'));
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.state).toBe('subscribed'));

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(unsubscribe).not.toHaveBeenCalled();
    expect(result.current.state).toBe('subscribed');
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'settings.notifications.disableFailed',
      }),
    );
  });

  it('deletes the server row before removing the browser subscription', async () => {
    const { unsubscribe } = installPushMocks({ initiallySubscribed: true });
    mocks.remove.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.state).toBe('subscribed'));

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(mocks.remove).toHaveBeenCalledWith(
      'https://push.example/subscription',
    );
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(
      unsubscribe.mock.invocationCallOrder[0],
    );
    expect(result.current.state).toBe('unsubscribed');
  });
});

// --- Helpers ---

type InstallPushMocksOptions = {
  initiallySubscribed?: boolean;
};

const installPushMocks = (options: InstallPushMocksOptions = {}): PushMocks => {
  const unsubscribe = vi.fn().mockResolvedValue(true);
  const subscription = {
    endpoint: 'https://push.example/subscription',
    unsubscribe,
    toJSON: () => ({
      endpoint: 'https://push.example/subscription',
      keys: { p256dh: 'public-key', auth: 'auth-secret' },
    }),
  } as unknown as PushSubscription;
  let existingSubscription: PushSubscription | null = null;
  if (options.initiallySubscribed) {
    existingSubscription = subscription;
  }

  const registration = {
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(existingSubscription),
      subscribe: vi.fn().mockResolvedValue(subscription),
    },
  } as unknown as ServiceWorkerRegistration;

  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue(registration),
    },
  });

  return { subscription, unsubscribe };
};
