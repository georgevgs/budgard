import { Suspense, useState } from 'react';
import {
  useCategoriesData,
  useDataConfig,
  useExpensesData,
} from '@/common/contexts/DataContext';
import { useUpgradeIntent } from '@/pages/pro/hooks/useUpgradeIntent';
import { shouldShowOnboarding } from '@/pages/onboarding/utils/onboarding';
import { OnboardingFlow } from '@/common/components/routing/lazyRouteModules';

export const OnboardingGate = () => {
  const expenses = useExpensesData();
  const { categories } = useCategoriesData();
  const { isInitialized, monthlyBudget } = useDataConfig();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [hasDismissedThisSession, setHasDismissedThisSession] = useState(false);

  const onboardingDue = shouldShowOnboarding(
    isInitialized,
    expenses.length,
    categories.length,
    monthlyBudget,
  );
  if (onboardingDue && !isOnboardingOpen && !hasDismissedThisSession) {
    setIsOnboardingOpen(true);
  }

  useUpgradeIntent(
    !isInitialized ||
      isOnboardingOpen ||
      (onboardingDue && !hasDismissedThisSession),
  );

  const handleDismiss = () => {
    setHasDismissedThisSession(true);
    setIsOnboardingOpen(false);
  };

  if (!isOnboardingOpen) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <OnboardingFlow
        isOpen={isOnboardingOpen}
        onComplete={() => setIsOnboardingOpen(false)}
        onDismiss={handleDismiss}
      />
    </Suspense>
  );
};
