import { captureException } from '@/config/sentry';
import { dataService } from '@/common/api/dataService';
import type { DataSession } from '@/common/hooks/data/dataSession';
import {
  mergeUniqueById,
  isAbortError,
  isExpiredJwtError,
} from '@/common/contexts/dataContextHelpers';
import { getRecentCutoff } from '@/constants/dataCache';

export const loadHistory = async (session: DataSession): Promise<void> => {
  if (!session.isActive) {
    return;
  }
  session.isHistoryRequested = true;
  if (session.isHistoryLoaded) {
    session.setters.setIsHistoryLoaded(true);

    return;
  }
  if (session.historyLoad) {
    return session.historyLoad;
  }
  session.historyController?.abort();
  const controller = new AbortController();
  session.historyController = controller;
  const promise = fetchHistoryTopUp(session, controller.signal).finally(() => {
    // A cancelled load can settle after foregrounding has started another.
    if (session.historyLoad === promise) {
      session.historyLoad = null;
    }
  });
  session.historyLoad = promise;

  return promise;
};

const fetchHistoryTopUp = async (
  session: DataSession,
  signal: AbortSignal,
): Promise<void> => {
  const { ownerId, setters } = session;
  const recentCutoff = getRecentCutoff();
  try {
    const [expenses, incomes] = await Promise.all([
      dataService.getExpenses(ownerId, signal, undefined, recentCutoff),
      dataService.getIncomes(ownerId, signal, undefined, recentCutoff),
    ]);
    if (signal.aborted) {
      return;
    }
    session.isHistoryLoaded = true;
    setters.setIsHistoryLoaded(true);
    // Concurrent mutations may already have inserted some of these rows.
    setters.setExpenses((prev) => mergeUniqueById(prev, expenses));
    setters.setIncomes((prev) => mergeUniqueById(prev, incomes));
  } catch (error) {
    if (signal.aborted || isAbortError(error) || isExpiredJwtError(error)) {
      return;
    }
    // Let screens leave their loading state; a later request can still retry.
    setters.setIsHistoryLoaded(true);
    captureException(error, { tags: { context: 'fetchOlderTransactions' } });
  }
};
