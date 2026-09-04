import { Suspense, useState } from 'react';
import {
  useCategoriesData,
  useDataConfig,
  useExpensesData,
} from '@/contexts/DataContext';
import { useUpgradeIntent } from '@/hooks/pro/useUpgradeIntent';
import { shouldShowOnboarding } from '@/lib/onboarding';
import { OnboardingFlow } from '@/components/routing/lazyRouteModules';

const OnboardingGate = () => {
  const expenses = useExpensesData();
  const { categories } = useCategoriesData();
  const { isInitialized, monthlyBudget } = useDataConfig();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  const onboardingDue = shouldShowOnboarding(
    isInitialized,
    expenses.length,
    categories.length,
    monthlyBudget,
  );
  if (onboardingDue && !showOnboarding && !dismissedThisSession) {
    setShowOnboarding(true);
  }

  useUpgradeIntent(
    !isInitialized ||
      showOnboarding ||
      (onboardingDue && !dismissedThisSession),
  );

  const handleDismiss = () => {
    setDismissedThisSession(true);
    setShowOnboarding(false);
  };

  if (!showOnboarding) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <OnboardingFlow
        isOpen={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        onDismiss={handleDismiss}
      />
    </Suspense>
  );
};

export default OnboardingGate;
