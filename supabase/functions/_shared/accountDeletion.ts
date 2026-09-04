import { shouldCancelStripeSubscription } from './stripeBilling.ts';

export type SubscriptionForDeletion = {
  stripe_subscription_id: string;
  status: string;
};

type AccountDeletionSteps = {
  deleteReceipts: () => Promise<void>;
  loadSubscription: () => Promise<SubscriptionForDeletion | null>;
  cancelSubscription: (subscriptionId: string) => Promise<void>;
  deleteAuthUser: () => Promise<void>;
};

// External systems cannot share a transaction, so order is the safety net:
// preserve the auth user until storage cleanup and Stripe cancellation both
// succeed. Every completed step is idempotent, making a later retry safe.
export const runAccountDeletion = async ({
  deleteReceipts,
  loadSubscription,
  cancelSubscription,
  deleteAuthUser,
}: AccountDeletionSteps): Promise<void> => {
  await deleteReceipts();

  const subscription = await loadSubscription();
  if (
    subscription &&
    shouldCancelStripeSubscription(subscription.status)
  ) {
    await cancelSubscription(subscription.stripe_subscription_id);
  }

  await deleteAuthUser();
};
