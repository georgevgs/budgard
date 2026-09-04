import { describe, expect, it, vi } from 'vitest';
import { runAccountDeletion } from '../../../supabase/functions/_shared/accountDeletion.ts';

const activeSubscription = {
  stripe_subscription_id: 'sub_123',
  status: 'active',
};

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
        cancelSubscription,
        deleteAuthUser,
      }),
    ).rejects.toBe(storageError);
    expect(loadSubscription).not.toHaveBeenCalled();
    expect(cancelSubscription).not.toHaveBeenCalled();
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });
});
