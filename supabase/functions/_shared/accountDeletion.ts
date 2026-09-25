import { shouldCancelStripeSubscription } from './stripeBilling.ts';

export type SubscriptionForDeletion = {
  stripe_subscription_id: string;
  stripe_customer_id: string | null;
  status: string;
};

type AccountDeletionSteps = {
  deleteReceipts: () => Promise<void>;
  loadSubscription: () => Promise<SubscriptionForDeletion | null>;
  // Null means Stripe could not enumerate the customer; see
  // listLiveStripeSubscriptions for why that does not block deletion.
  listLiveSubscriptions: (
    subscription: SubscriptionForDeletion,
  ) => Promise<string[] | null>;
  cancelSubscription: (subscriptionId: string) => Promise<void>;
  deleteAuthUser: () => Promise<void>;
};

// External systems cannot share a transaction, so order is the safety net:
// preserve the auth user until storage cleanup and Stripe cancellation both
// succeed. Every completed step is idempotent, making a later retry safe.
export const runAccountDeletion = async ({
  deleteReceipts,
  loadSubscription,
  listLiveSubscriptions,
  cancelSubscription,
  deleteAuthUser,
}: AccountDeletionSteps): Promise<void> => {
  await deleteReceipts();

  const subscription = await loadSubscription();
  if (subscription) {
    const subscriptionIds = await collectCancellations(
      subscription,
      listLiveSubscriptions,
    );
    for (const subscriptionId of subscriptionIds) {
      await cancelSubscription(subscriptionId);
    }
  }

  await deleteAuthUser();
};

// The row's own subscription plus any other live one on the same customer,
// each once.
const collectCancellations = async (
  subscription: SubscriptionForDeletion,
  listLiveSubscriptions: AccountDeletionSteps['listLiveSubscriptions'],
): Promise<string[]> => {
  const subscriptionIds = new Set<string>();
  if (shouldCancelStripeSubscription(subscription.status)) {
    subscriptionIds.add(subscription.stripe_subscription_id);
  }

  const liveIds = await listLiveSubscriptions(subscription);
  if (liveIds === null) {
    console.error(
      'account deletion: Stripe could not list the customer subscriptions; ' +
        'cancelling only the recorded one',
    );
  }
  for (const liveId of liveIds ?? []) {
    subscriptionIds.add(liveId);
  }

  return [...subscriptionIds];
};
