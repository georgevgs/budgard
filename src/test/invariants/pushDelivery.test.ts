import { describe, expect, it, vi } from 'vitest';
import {
  deliverPush,
  isAllowedPushSubscription,
} from '../../../supabase/functions/_shared/pushDelivery.ts';

const subscription = (endpoint: string) => ({
  endpoint,
  p256dh: 'B'.repeat(87),
  auth: 'A'.repeat(22),
});

describe('push delivery security', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/device-token:APA91b_token',
    'https://updates.push.services.mozilla.com/wpush/v2/device-token',
    'https://web.push.apple.com/Q/device-token',
    'https://wns2.notify.windows.com/w/?token=abc%2Fdef',
  ])(
    'sends to the supported push service %s with a timeout',
    async (endpoint) => {
      const send = vi.fn().mockResolvedValue({ statusCode: 201 });

      await expect(
        deliverPush(subscription(endpoint), 'payload', send),
      ).resolves.toBe('sent');
      expect(send).toHaveBeenCalledWith(
        { endpoint, keys: { p256dh: 'B'.repeat(87), auth: 'A'.repeat(22) } },
        'payload',
        { timeout: 5000 },
      );
    },
  );

  it.each([
    'http://fcm.googleapis.com/fcm/send/token',
    'https://127.0.0.1/private',
    'https://169.254.169.254/latest/meta-data',
    'https://[::1]/private',
    'https://attacker.example/push',
    'https://fcm.googleapis.com.attacker.example/push',
    'https://fcm.googleapis.com@attacker.example/push',
    'https://attacker.example@fcm.googleapis.com/push',
    'https://fcm.googleapis.com:8443/push',
    'https://fcm.googleapis.com./push',
    'https://fcm.googleapis.com\\@attacker.example/push',
    'https://fcm.googleapis.com/push#fragment',
    'https://fcm.googleapis.com/push\n',
    `https://fcm.googleapis.com/${'a'.repeat(2048)}`,
  ])('blocks %s without making a network request', async (endpoint) => {
    const send = vi.fn();

    await expect(
      deliverPush(subscription(endpoint), 'payload', send),
    ).resolves.toBe('blocked');
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects malformed subscription keys before delivery', async () => {
    const send = vi.fn();
    const malformed = {
      ...subscription('https://web.push.apple.com/token'),
      auth: 'short',
    };

    await expect(deliverPush(malformed, 'payload', send)).resolves.toBe(
      'blocked',
    );
    expect(send).not.toHaveBeenCalled();
    expect(
      isAllowedPushSubscription({
        ...malformed,
        auth: 'A'.repeat(22),
        p256dh: 'invalid',
      }),
    ).toBe(false);
  });

  it.each([404, 410])(
    'marks status %s as an expired subscription',
    async (statusCode) => {
      const send = vi.fn().mockRejectedValue({ statusCode });

      await expect(
        deliverPush(
          subscription('https://web.push.apple.com/token'),
          'payload',
          send,
        ),
      ).resolves.toBe('stale');
    },
  );

  it.each([new Error('timeout'), { statusCode: 503 }, null])(
    'retains subscriptions after a transient failure (%s)',
    async (error) => {
      const send = vi.fn().mockRejectedValue(error);

      await expect(
        deliverPush(
          subscription('https://web.push.apple.com/token'),
          'payload',
          send,
        ),
      ).resolves.toBe('failed');
    },
  );
});
