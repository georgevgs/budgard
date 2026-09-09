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
    // Deferred domains go out now, alongside the essential batch rather than
    // after it, so nothing is slower than it was — but they are awaited
    // separately. A slow notification read no longer holds the dashboard
    // back, and a failing one no longer rejects the whole boot.
    startDeferredFetch(session, controller.signal);
    const { expenses, incomes, ...values } = await fetchEssentialData(
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

// What the first authenticated screen is made of, and nothing else. Every
// request here is one the dashboard cannot draw without, so they are awaited
// together and committed in one go; anything that only a form, a settings
// screen or a child route reads belongs in the deferred stage below.
const fetchEssentialData = async (
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
    tags,
    categoryBudgets,
    noSpendDays,
  ] = await Promise.all([
    dataService.getCategories(ownerId, signal),
    dataService.getExpenses(ownerId, signal, recentCutoff),
    dataService.getIncomes(ownerId, signal, recentCutoff),
    dataService.getRecurringExpenses(ownerId, signal),
    dataService.getRecurringIncomes(ownerId, signal),
    dataService.getBudget(ownerId, signal),
    dataService.getTags(ownerId, signal),
    dataService.getCategoryBudgets(ownerId, signal),
    dataService.getNoSpendDays(ownerId, signal),
  ]);

  return {
    categories,
    expenses,
    incomes,
    recurringExpenses,
    recurringIncomes,
    tags,
    categoryBudgets,
    noSpendDays,
    monthlyBudget: budget?.monthly_amount ?? null,
    defaultCurrency: budget?.default_currency ?? 'EUR',
    defaultSavingsPct: budget?.default_savings_pct ?? null,
    isInitialized: true,
  };
};

// Two independent groups, both started with the essential batch. They are
// split because the debt accrual is a write followed by a read, so anything
// grouped with it inherits that chain's latency for no reason.
//
// isSecondaryLoaded flips only once both have landed. That flag is the
// loading state the deferred domains are read behind — PlanView, GoalsList,
// NetWorthView and DebtsView all wait on it before drawing content.
const startDeferredFetch = (
  session: DataSession,
  signal: AbortSignal,
): void => {
  Promise.all([
    fetchAuxiliaryDomains(session, signal),
    fetchChildRouteDomains(session, signal),
  ])
    .then(() => {
      if (signal.aborted) {
        return;
      }
      session.setters.setIsSecondaryLoaded(true);
    })
    .catch((error) => {
      if (signal.aborted || isAbortError(error) || isExpiredJwtError(error)) {
        return;
      }
      captureException(error, { tags: { context: 'fetchSecondaryDomains' } });
    });
};

// Forms and the settings screen. None of these draws on the first paint:
// the templates bar renders nothing until it has templates, the account
// picker belongs to the recurring and goal forms, and notification settings
// default to "on" in exactly the way the edge function reads a missing row.
const fetchAuxiliaryDomains = async (
  session: DataSession,
  signal: AbortSignal,
): Promise<void> => {
  const { ownerId, setters } = session;
  const [accounts, templates, notifications] = await Promise.all([
    dataService.getAccounts(ownerId, signal),
    dataService.getTemplates(ownerId, signal),
    dataService.getNotificationSettings(signal),
  ]);
  if (signal.aborted) {
    return;
  }
  setters.setAccounts(accounts);
  setters.setTemplates(templates);
  setters.setDailyReminderHour(notifications?.daily_reminder_hour ?? null);
  setters.setNotificationPreferences(
    notifications?.notification_preferences ?? {},
  );
};

// Child-route data must not block the first paint of the main tabs.
const fetchChildRouteDomains = async (
  session: DataSession,
  signal: AbortSignal,
): Promise<void> => {
  const { ownerId, setters } = session;
  const [goals, balances, debts] = await Promise.all([
    dataService.getGoals(ownerId, signal),
    dataService.getAllAccountBalances(ownerId, signal),
    // Accrual is best-effort; a failure must not stop debts from loading.
    dataService
      .refreshDebtBalances(ownerId)
      .catch(() => undefined)
      .then(() => dataService.getDebts(ownerId, signal)),
  ]);
  if (signal.aborted) {
    return;
  }
  setters.setGoals(goals);
  setters.setAccountBalances(balances);
  setters.setDebts(debts);
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
