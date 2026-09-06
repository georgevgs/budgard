import { lazyWithRetry } from '@/constants/lazyWithRetry';

export const TodayView = lazyWithRetry(
  () => import('@/pages/today/TodayView'),
);
export const ActivityView = lazyWithRetry(
  () => import('@/pages/activity/ActivityView'),
);
export const PlanView = lazyWithRetry(
  () => import('@/pages/plan/PlanView'),
);
export const AnalyticsView = lazyWithRetry(
  () => import('@/pages/analytics/AnalyticsView'),
);
export const TrendsDeepDiveView = lazyWithRetry(
  () => import('@/pages/analytics/TrendsDeepDiveView'),
);
export const RecurringExpensesList = lazyWithRetry(
  () => import('@/pages/recurring/RecurringExpensesList'),
);
export const GoalsList = lazyWithRetry(
  () => import('@/pages/goals/GoalsList'),
);
export const NetWorthView = lazyWithRetry(
  () => import('@/pages/networth/NetWorthView'),
);
export const DebtsView = lazyWithRetry(
  () => import('@/pages/debts/DebtsView'),
);
export const LockScreen = lazyWithRetry(
  () => import('@/pages/security/LockScreen'),
);
export const TransactionDetailView = lazyWithRetry(
  () => import('@/pages/transaction/TransactionDetailView'),
);
export const SettingsView = lazyWithRetry(
  () => import('@/pages/settings/SettingsView'),
);
export const JoinHouseholdView = lazyWithRetry(
  () => import('@/pages/household/JoinHouseholdView'),
);
export const ReviewQueueView = lazyWithRetry(
  () => import('@/pages/review/ReviewQueueView'),
);
export const LandingPage = lazyWithRetry(() => import('@/pages/landing/LandingPage'));
export const PrivacyPage = lazyWithRetry(
  () => import('@/pages/legal/PrivacyPage'),
);
export const TermsPage = lazyWithRetry(() => import('@/pages/legal/TermsPage'));
export const ContactPage = lazyWithRetry(
  () => import('@/pages/legal/ContactPage'),
);
export const OnboardingFlow = lazyWithRetry(
  () => import('@/pages/onboarding/OnboardingFlow'),
);

export const prefetchMainTabModules = (): void => {
  const swallow = () => {};
  import('@/pages/today/TodayView').catch(swallow);
  import('@/pages/activity/ActivityView').catch(swallow);
  import('@/pages/plan/PlanView').catch(swallow);
  import('@/pages/recurring/RecurringExpensesList').catch(swallow);
  import('@/pages/analytics/AnalyticsView').catch(swallow);
};
