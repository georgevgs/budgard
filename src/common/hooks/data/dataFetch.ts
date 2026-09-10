import { captureException } from '@/config/sentry';
import { dataService } from '@/common/api/dataService';
import type { DataSession } from '@/common/hooks/data/dataSession';
import {
  replaceRecentWindow,
  isAbortError,
  isExpiredJwtError,
} from '@/common/contexts/dataContextHelpers';
import { getRecentCutoff } from '@/constants/dataCache';
import { fetchDeferredData } from '@/common/hooks/data/dataDeferred';
import { refreshOptionalData } from '@/common/hooks/data/dataOptional';

export const fetchData = (
  session: DataSession,
  isForced = false,
): Promise<void> => {
  if (!session.isActive) {
    return Promise.resolve();
  }
  if (!isForced && session.fetchPromise) {
    return session.fetchPromise;
  }
  const promise = performFetch(session, isForced).finally(() => {
    if (session.fetchPromise === promise) {
      session.fetchPromise = null;
    }
  });
  session.fetchPromise = promise;

  return promise;
};

const performFetch = async (
  session: DataSession,
  isForced: boolean,
): Promise<void> => {
  session.controller?.abort();
  const controller = new AbortController();
  session.controller = controller;
  session.isFetching = true;
  const recentCutoff = getRecentCutoff();
  let sinceDate: string | undefined = recentCutoff;
  if (session.isHistoryLoaded) {
    sinceDate = undefined;
  }

  const deferred = fetchDeferredData(
    session,
    controller.signal,
    isForced,
  ).catch((error) => {
    if (!controller.signal.aborted) {
      handleFetchError(error, session);
    }
  });
  let optional = Promise.resolve();
  if (isForced) {
    optional = refreshOptionalData(session).catch((error) => {
      if (!controller.signal.aborted) {
        handleFetchError(error, session);
      }
    });
  }

  try {
    const { expenses, incomes, ...values } = await fetchEssentialData(
      session.ownerId,
      controller.signal,
      sinceDate,
    );
    if (controller.signal.aborted) {
      return;
    }
    session.dispatch({ type: 'applyPrimary', values });
    if (session.isHistoryLoaded && sinceDate !== undefined) {
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
    await Promise.all([deferred, optional]);
    if (session.controller === controller) {
      session.isFetching = false;
    }
  }
};

// What the first authenticated screen is made of, and nothing else. Every
// request here is one the dashboard cannot draw without, so they are awaited
// together and committed in one go. Other summaries load independently;
// data used only by a form or settings screen loads on demand.
const fetchEssentialData = async (
  ownerId: string,
  signal: AbortSignal,
  recentCutoff: string | undefined,
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
        void fetchData(session, true);
      },
    },
  });
};
