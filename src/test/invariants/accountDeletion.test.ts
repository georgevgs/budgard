import { describe, expect, it, vi } from 'vitest';
import { runAccountDeletion } from '../../../supabase/functions/_shared/accountDeletion.ts';

const activeSubscription = {
  stripe_subscription_id: 'sub_123',
  stripe_customer_id: 'cus_123',
  status: 'active',
};

const noOtherSubscriptions = () => Promise.resolve([]);

describe('Account deletion orchestration', () => {
  it('cleans storage, cancels billing, then deletes the auth user', async () => {
    const calls: string[] = [];
    const deleteReceipts = vi.fn(async () => {
      calls.push('receipts');
    });
    const loadSubscription = vi.fn(async () => {
      calls.push('load-subscription');

      return activeSubscription;
    });
    const cancelSubscription = vi.fn(async () => {
      calls.push('cancel-subscription');
    });
    const deleteAuthUser = vi.fn(async () => {
      calls.push('delete-user');
    });

    await runAccountDeletion({
      deleteReceipts,
      loadSubscription,
      listLiveSubscriptions: noOtherSubscriptions,
      cancelSubscription,
      deleteAuthUser,
    });

    expect(calls).toEqual([
      'receipts',
      'load-subscription',
      'cancel-subscription',
      'delete-user',
    ]);
    expect(cancelSubscription).toHaveBeenCalledWith('sub_123');
  });

  it('does not call Stripe for a terminal subscription', async () => {
    const cancelSubscription = vi.fn();
    const deleteAuthUser = vi.fn().mockResolvedValue(undefined);

    await runAccountDeletion({
      deleteReceipts: vi.fn().mockResolvedValue(undefined),
      loadSubscription: vi.fn().mockResolvedValue({
        ...activeSubscription,
        status: 'canceled',
      }),
      listLiveSubscriptions: noOtherSubscriptions,
      cancelSubscription,
      deleteAuthUser,
    });

    expect(cancelSubscription).not.toHaveBeenCalled();
    expect(deleteAuthUser).toHaveBeenCalledOnce();
  });

  it('deletes a free account without calling Stripe', async () => {
    const cancelSubscription = vi.fn();
    const deleteAuthUser = vi.fn().mockResolvedValue(undefined);

    await runAccountDeletion({
      deleteReceipts: vi.fn().mockResolvedValue(undefined),
      loadSubscription: vi.fn().mockResolvedValue(null),
      listLiveSubscriptions: noOtherSubscriptions,
      cancelSubscription,
      deleteAuthUser,
    });

    expect(cancelSubscription).not.toHaveBeenCalled();
    expect(deleteAuthUser).toHaveBeenCalledOnce();
  });

  it('does not delete the user when Stripe cancellation fails', async () => {
    const cancelError = new Error('Stripe unavailable');
    const deleteAuthUser = vi.fn();

    await expect(
      runAccountDeletion({
        deleteReceipts: vi.fn().mockResolvedValue(undefined),
        loadSubscription: vi.fn().mockResolvedValue(activeSubscription),
        listLiveSubscriptions: noOtherSubscriptions,
        cancelSubscription: vi.fn().mockRejectedValue(cancelError),
        deleteAuthUser,
      }),
    ).rejects.toBe(cancelError);
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });

  it('does not delete the user when the subscription lookup fails', async () => {
    const lookupError = new Error('Database unavailable');
    const cancelSubscription = vi.fn();
    const deleteAuthUser = vi.fn();

    await expect(
      runAccountDeletion({
        deleteReceipts: vi.fn().mockResolvedValue(undefined),
        loadSubscription: vi.fn().mockRejectedValue(lookupError),
        listLiveSubscriptions: noOtherSubscriptions,
        cancelSubscription,
        deleteAuthUser,
      }),
    ).rejects.toBe(lookupError);
    expect(cancelSubscription).not.toHaveBeenCalled();
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });

  it('stops before billing when receipt cleanup fails', async () => {
    const storageError = new Error('Storage unavailable');
    const loadSubscription = vi.fn();
    const cancelSubscription = vi.fn();
    const deleteAuthUser = vi.fn();

    await expect(
      runAccountDeletion({
        deleteReceipts: vi.fn().mockRejectedValue(storageError),
        loadSubscription,
        listLiveSubscriptions: noOtherSubscriptions,
        cancelSubscription,
        deleteAuthUser,
      }),
    ).rejects.toBe(storageError);
    expect(loadSubscription).not.toHaveBeenCalled();
    expect(cancelSubscription).not.toHaveBeenCalled();
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });
  it('also cancels a second live subscription on the same customer', async () => {
    const cancelSubscription = vi.fn().mockResolvedValue(undefined);
    const deleteAuthUser = vi.fn().mockResolvedValue(undefined);

    await runAccountDeletion({
      deleteReceipts: vi.fn().mockResolvedValue(undefined),
      loadSubscription: vi.fn().mockResolvedValue(activeSubscription),
      listLiveSubscriptions: vi.fn().mockResolvedValue(['sub_123', 'sub_456']),
      cancelSubscription,
      deleteAuthUser,
    });

    expect(cancelSubscription.mock.calls).toEqual([['sub_123'], ['sub_456']]);
    expect(deleteAuthUser).toHaveBeenCalledOnce();
  });

  it('cancels a live subscription even when the recorded one has ended', async () => {
    const cancelSubscription = vi.fn().mockResolvedValue(undefined);

    await runAccountDeletion({
      deleteReceipts: vi.fn().mockResolvedValue(undefined),
      loadSubscription: vi.fn().mockResolvedValue({
        ...activeSubscription,
        status: 'canceled',
      }),
      listLiveSubscriptions: vi.fn().mockResolvedValue(['sub_456']),
      cancelSubscription,
      deleteAuthUser: vi.fn().mockResolvedValue(undefined),
    });

    expect(cancelSubscription.mock.calls).toEqual([['sub_456']]);
  });

  it('still cancels the recorded subscription when Stripe cannot list the customer', async () => {
    const cancelSubscription = vi.fn().mockResolvedValue(undefined);
    const deleteAuthUser = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await runAccountDeletion({
      deleteReceipts: vi.fn().mockResolvedValue(undefined),
      loadSubscription: vi.fn().mockResolvedValue(activeSubscription),
      listLiveSubscriptions: vi.fn().mockResolvedValue(null),
      cancelSubscription,
      deleteAuthUser,
    });

    expect(cancelSubscription.mock.calls).toEqual([['sub_123']]);
    expect(deleteAuthUser).toHaveBeenCalledOnce();
  });

  it('keeps the account when listing the customer fails transiently', async () => {
    const listError = new Error('Stripe listing failed with status 503');
    const deleteAuthUser = vi.fn();

    await expect(
      runAccountDeletion({
        deleteReceipts: vi.fn().mockResolvedValue(undefined),
        loadSubscription: vi.fn().mockResolvedValue(activeSubscription),
        listLiveSubscriptions: vi.fn().mockRejectedValue(listError),
        cancelSubscription: vi.fn(),
        deleteAuthUser,
      }),
    ).rejects.toBe(listError);
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });
});
