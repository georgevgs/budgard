import { useEffect } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';
import { consumeUpgradeIntent } from '@/lib/upgradeIntent';

// Completes the landing page's Get Pro funnel: once the user is signed in
// (and not busy with onboarding), open the upgrade dialog on the plan they
// picked before authenticating. isBlocked keeps the intent stored — not
// consumed — until onboarding is out of the way, so the dialog never stacks
// on top of it.
export const useUpgradeIntent = (isBlocked: boolean) => {
  const { isPro, isLoading } = useSubscription();
  const { openUpgrade } = useUpgradeDialog();

  useEffect(() => {
    if (isBlocked || isLoading) return;

    const plan = consumeUpgradeIntent();
    if (!plan) return;
    // An already-Pro user has nothing to buy; the consumed intent is simply
    // discarded.
    if (isPro) return;

    openUpgrade(plan);
  }, [isBlocked, isLoading, isPro, openUpgrade]);
};
