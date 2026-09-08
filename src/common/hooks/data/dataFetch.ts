import { captureException } from '@/config/sentry';
import { dataService } from '@/common/api/dataService';
import type { DataSession } from '@/common/hooks/data/dataSession';
import {
  replaceRecentWindow,
  isAbortError,
  isExpiredJwtError,
} from '@/common/contexts/dataContextHelpers';
import { getRecentCutoff } from '@/constants/dataCache';

export const fetchData = async (session: DataSession): Promise<void> => {
  if (!session.isActive) {
    return;
  }
  session.controller?.abort();
  const controller = new AbortController();
  session.controller = controller;
  session.isFetching = true;
  const recentCutoff = getRecentCutoff();

  try {
    const { expenses, incomes, ...values } = await fetchPrimaryData(
      session.ownerId,
      controller.signal,
      recentCutoff,
    );
    if (controller.signal.aborted) {
      return;
    }
    session.dispatch({ type: 'applyPrimary', values });
    if (session.isHistoryLoaded) {
      // Preserve the older tail, but allow server deletions in the recent
      // window to disappear. A merge alone would resurrect those rows.
      session.setters.setIsHistoryLoaded(true);
      session.setters.setExpenses((prev) =>
        replaceRecentWindow(prev, expenses, recentCutoff),
      );
      session.setters.setIncomes((prev) =>
        replaceRecentWindow(prev, incomes, recentCutoff),
      );
    } else {
      session.setters.setExpenses(expenses);
      session.setters.setIncomes(incomes);
    }
    session.isHydratedFromCache = false;
    session.lastFetchAt = Date.now();
    session.wasAborted = false;
    startSecondaryFetch(session, controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }
    handleFetchError(error, session);
  } finally {
    if (session.controller === controller) {
      session.isFetching = false;
    }
  }
};

const fetchPrimaryData = async (
  ownerId: string,
  signal: AbortSignal,
  recentCutoff: string,
) => {
  const [
    categories,
    expenses,
    incomes,
    recurringExpenses,
    recurringIncomes,
    budget,
    notifications,
    tags,
    templates,
    categoryBudgets,
    accounts,
    noSpendDays,
  ] = await Promise.all([
    dataService.getCategories(ownerId, signal),
    dataService.getExpenses(ownerId, signal, recentCutoff),
    dataService.getIncomes(ownerId, signal, recentCutoff),
    dataService.getRecurringExpenses(ownerId, signal),
    dataService.getRecurringIncomes(ownerId, signal),
    dataService.getBudget(ownerId, signal),
    dataService.getNotificationSettings(signal),
    dataService.getTags(ownerId, signal),
    dataService.getTemplates(ownerId, signal),
    dataService.getCategoryBudgets(ownerId, signal),
    // Accounts are needed by the recurring form on the initial tabs.
    dataService.getAccounts(ownerId, signal),
    dataService.getNoSpendDays(ownerId, signal),
  ]);

  return {
    categories,
    expenses,
    incomes,
    recurringExpenses,
    recurringIncomes,
    tags,
    templates,
    categoryBudgets,
    accounts,
    noSpendDays,
    monthlyBudget: budget?.monthly_amount ?? null,
    defaultCurrency: budget?.default_currency ?? 'EUR',
    defaultSavingsPct: budget?.default_savings_pct ?? null,
    dailyReminderHour: notifications?.daily_reminder_hour ?? null,
    notificationPreferences: notifications?.notification_preferences ?? {},
    isInitialized: true,
  };
};

// Child-route data must not block the first paint of the main tabs.
const startSecondaryFetch = (
  session: DataSession,
  signal: AbortSignal,
): void => {
  const { ownerId, setters } = session;
  Promise.all([
    dataService.getGoals(ownerId, signal),
    dataService.getAllAccountBalances(ownerId, signal),
    // Accrual is best-effort; a failure must not stop debts from loading.
    dataService
      .refreshDebtBalances(ownerId)
      .catch(() => undefined)
      .then(() => dataService.getDebts(ownerId, signal)),
  ])
    .then(([goals, balances, debts]) => {
      if (signal.aborted) {
        return;
      }
      setters.setGoals(goals);
      setters.setAccountBalances(balances);
      setters.setDebts(debts);
      setters.setIsSecondaryLoaded(true);
    })
    .catch((error) => {
      if (signal.aborted || isAbortError(error) || isExpiredJwtError(error)) {
        return;
      }
      captureException(error, { tags: { context: 'fetchSecondaryDomains' } });
    });
};

const handleFetchError = (error: unknown, session: DataSession): void => {
  if (isAbortError(error)) {
    session.wasAborted = true;

    return;
  }
  if (isExpiredJwtError(error)) {
    return;
  }
  captureException(error, { tags: { context: 'fetchData' } });
  console.error('Failed to load data:', error);
  // A failed boot refresh leaves the hydrated view usable. Later failures
  // surface normally once fresh server data has replaced the snapshot.
  if (session.isHydratedFromCache) {
    return;
  }
  const { t, toast } = session.getFeedback();
  toast({
    title: t('common.error'),
    description: t('common.loadDataFailed'),
    variant: 'destructive',
    action: {
      label: t('common.tryAgain'),
      onClick: () => {
        void fetchData(session);
      },
    },
  });
};
