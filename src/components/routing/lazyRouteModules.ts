import { lazyWithRetry } from '@/lib/lazyWithRetry';

export const TodayView = lazyWithRetry(
  () => import('@/components/today/TodayView'),
);
export const ActivityView = lazyWithRetry(
  () => import('@/components/activity/ActivityView'),
);
export const PlanView = lazyWithRetry(
  () => import('@/components/plan/PlanView'),
);
export const AnalyticsView = lazyWithRetry(
  () => import('@/components/analytics/AnalyticsView'),
);
export const TrendsDeepDiveView = lazyWithRetry(
  () => import('@/components/analytics/TrendsDeepDiveView'),
);
export const RecurringExpensesList = lazyWithRetry(
  () => import('@/components/recurring/RecurringExpensesList'),
);
export const GoalsList = lazyWithRetry(
  () => import('@/components/goals/GoalsList'),
);
export const NetWorthView = lazyWithRetry(
  () => import('@/components/networth/NetWorthView'),
);
export const DebtsView = lazyWithRetry(
  () => import('@/components/debts/DebtsView'),
);
export const LockScreen = lazyWithRetry(
  () => import('@/components/security/LockScreen'),
);
export const TransactionDetailView = lazyWithRetry(
  () => import('@/components/transaction/TransactionDetailView'),
);
export const SettingsView = lazyWithRetry(
  () => import('@/components/settings/SettingsView'),
);
export const JoinHouseholdView = lazyWithRetry(
  () => import('@/components/household/JoinHouseholdView'),
);
export const ReviewQueueView = lazyWithRetry(
  () => import('@/components/review/ReviewQueueView'),
);
export const LandingPage = lazyWithRetry(() => import('@/pages/LandingPage'));
export const PrivacyPage = lazyWithRetry(
  () => import('@/pages/legal/PrivacyPage'),
);
export const TermsPage = lazyWithRetry(() => import('@/pages/legal/TermsPage'));
export const ContactPage = lazyWithRetry(
  () => import('@/pages/legal/ContactPage'),
);
export const OnboardingFlow = lazyWithRetry(
  () => import('@/components/onboarding/OnboardingFlow'),
);

export const prefetchMainTabModules = (): void => {
  const swallow = () => {};
  import('@/components/today/TodayView').catch(swallow);
  import('@/components/activity/ActivityView').catch(swallow);
  import('@/components/plan/PlanView').catch(swallow);
  import('@/components/recurring/RecurringExpensesList').catch(swallow);
  import('@/components/analytics/AnalyticsView').catch(swallow);
};
